from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.shortcuts import get_object_or_404, redirect, render

from recommendations.models import GeneralRecommendation, MedicineStore

from .analysis_engine import analyze_report, get_condition_mappings_for_report
from .forms import ReportUploadForm
from .models import Report
from .pdf_parser import PDFParseError, extract_text_from_pdf, parse_test_lines


@login_required
def dashboard(request):
    """User's home page: list of all their past reports."""
    reports = Report.objects.filter(user=request.user)
    return render(request, "reports/dashboard.html", {"reports": reports})


@login_required
def upload_report(request):
    if request.method == "POST":
        form = ReportUploadForm(request.POST, request.FILES)
        if form.is_valid():
            report = form.save(commit=False)
            report.user = request.user
            report.save()

            # Parse + analyze immediately (synchronous for simplicity;
            # move to a Celery task for production with large volumes).
            try:
                raw_text = extract_text_from_pdf(report.pdf_file.path)
                report.raw_extracted_text = raw_text
                parsed_lines = parse_test_lines(raw_text)
                if not parsed_lines:
                    report.parse_error = (
                        "Could not detect any recognizable test lines in this PDF. "
                        "The layout may not be supported yet."
                    )
                    report.save()
                else:
                    analyze_report(report, parsed_lines)
            except PDFParseError as exc:
                report.parse_error = str(exc)
                report.save()

            return redirect("reports:detail", pk=report.pk)
    else:
        form = ReportUploadForm()
    return render(request, "reports/upload.html", {"form": form})


@login_required
def report_detail(request, pk):
    report = get_object_or_404(Report, pk=pk, user=request.user)

    profile = getattr(request.user, "profile", None)
    age = profile.age if profile else None
    context = {
        "report": report,
        "patient_age": age,
        "age_guidance": _age_based_guidance(age),
        "profile": profile,
        "google_places_enabled": (
            settings.PLACES_PROVIDER == "google"
            and bool(settings.GOOGLE_PLACES_API_KEY)
        ),
        "nearby_places_enabled": True,
    }

    if report.status == Report.STATUS_NORMAL:
        context["general_recommendation"] = GeneralRecommendation.objects.filter(
            is_active=True
        ).first()

    elif report.status == Report.STATUS_ABNORMAL:
        mappings = get_condition_mappings_for_report(report)
        context["mappings"] = mappings

        # Gather medicine store suggestions for every medicine mentioned
        # across all relevant condition mappings.
        medicine_names = set()
        for m in mappings:
            medicine_names.update(m.medicine_list())

        stores_by_medicine = {}
        for med in medicine_names:
            stores_by_medicine[med] = {
                "physical": MedicineStore.objects.filter(
                    medicine_name__iexact=med,
                    store_type=MedicineStore.STORE_PHYSICAL,
                    latitude__isnull=False,
                    longitude__isnull=False,
                ),
                "online": MedicineStore.objects.filter(
                    medicine_name__iexact=med, store_type=MedicineStore.STORE_ONLINE
                ),
                # Fallback generic search links if no curated entry exists yet.
                "generic_online_links": _generic_online_search_links(med),
            }
        context["stores_by_medicine"] = stores_by_medicine

    return render(request, "reports/detail.html", context)


@login_required
def delete_report(request, pk):
    """A user can delete only their own report."""
    report = get_object_or_404(Report, pk=pk, user=request.user)
    if request.method == "POST":
        report.pdf_file.delete(save=False)
        report.delete()
        messages.success(request, "Report deleted.")
        return redirect("reports:dashboard")
    return render(request, "reports/confirm_delete.html", {"report": report})


def _generic_online_search_links(medicine_name):
    """Build ready-to-click search URLs on popular Indian online pharmacies."""
    query = medicine_name.replace(" ", "+")
    return [
        {"name": "1mg", "url": f"https://www.1mg.com/search/all?name={query}"},
        {"name": "PharmEasy", "url": f"https://pharmeasy.in/search/all?name={query}"},
        {"name": "Netmeds", "url": f"https://www.netmeds.com/catalogsearch/result?q={query}"},
    ]


def _age_based_guidance(age):
    """Return conservative lifestyle guidance appropriate to the user's age group."""
    if age is None:
        return {
            "label": "Age not provided",
            "diet": (
                "Add your age in My Profile to receive age-appropriate guidance. "
                "Until then, follow the condition-specific advice only after checking "
                "it with a healthcare professional."
            ),
            "activity": (
                "Choose activity suitable for your present fitness and health. Stop "
                "if you feel chest pain, faintness, or unusual shortness of breath."
            ),
            "care": "A doctor can recommend a safe plan after considering your age.",
        }

    if age < 6:
        return {
            "label": f"Young child ({age} years)",
            "diet": (
                "Young children need enough energy and nutrients for growth. A parent "
                "or guardian should discuss this result and any diet change with a "
                "pediatrician; do not use a restrictive diet unless prescribed."
            ),
            "activity": (
                "Young children generally benefit from varied active play throughout "
                "the day. Ask a pediatrician whether this finding requires any change "
                "or restriction."
            ),
            "care": (
                "Review the result promptly with a pediatrician and involve a parent "
                "or guardian in every treatment decision."
            ),
        }

    if age < 18:
        return {
            "label": f"Child or adolescent ({age} years)",
            "diet": (
                "Growth and nutrition needs are different before age 18. A parent or "
                "guardian should discuss major diet changes with a pediatrician or "
                "qualified dietitian; avoid restrictive or weight-loss diets unless "
                "a clinician recommends them."
            ),
            "activity": (
                "When medically safe, ages 6–17 generally benefit from about 60 "
                "minutes of enjoyable moderate-to-vigorous activity each day. With "
                "an abnormal result, ask a pediatrician whether any restriction is needed."
            ),
            "care": (
                "Review the result with a pediatrician and involve a parent or guardian "
                "in follow-up and treatment decisions."
            ),
        }

    if age < 65:
        return {
            "label": f"Adult ({age} years)",
            "diet": (
                "Use the condition-specific diet guidance as part of a balanced diet. "
                "If you have another condition, take medicine, are pregnant, or follow "
                "a special diet, confirm changes with your doctor or dietitian."
            ),
            "activity": (
                "When medically safe, adults generally aim for at least 150 minutes "
                "of moderate activity each week plus muscle-strengthening activity on "
                "2 days. Begin gradually and ask your doctor about limits for this finding."
            ),
            "care": (
                "Arrange follow-up with the recommended clinician, who may repeat the "
                "test or consider symptoms, medicines, and medical history."
            ),
        }

    return {
        "label": f"Older adult ({age} years)",
        "diet": (
            "Follow the condition-specific advice while maintaining adequate food, "
            "protein, and fluids unless your clinician has restricted them. Ask a "
            "doctor or dietitian to check for medicine and diet interactions."
        ),
        "activity": (
            "When medically safe, older adults generally aim for about 150 minutes of "
            "moderate activity weekly, strength work on 2 days, and balance activity. "
            "Start at a comfortable level and prioritize fall safety."
        ),
        "care": (
            "Arrange a clinician review, especially if you take several medicines, "
            "have other long-term conditions, or notice new symptoms."
        ),
    }
