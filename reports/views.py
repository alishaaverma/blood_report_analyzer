from django.contrib import messages
from django.contrib.auth.decorators import login_required
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

    context = {"report": report}

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
                    medicine_name__iexact=med, store_type=MedicineStore.STORE_PHYSICAL
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
