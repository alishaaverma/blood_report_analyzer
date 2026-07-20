from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404, redirect, render

from reports.models import Report


@staff_member_required
def admin_dashboard(request):
    """Overview: total users, total reports, quick stats."""
    context = {
        "total_users": User.objects.count(),
        "total_reports": Report.objects.count(),
        "abnormal_reports": Report.objects.filter(status=Report.STATUS_ABNORMAL).count(),
        "recent_reports": Report.objects.select_related("user").order_by("-uploaded_at")[:10],
    }
    return render(request, "admin_panel/dashboard.html", context)


@staff_member_required
def user_list(request):
    """All registered users, with their report counts."""
    users = User.objects.prefetch_related("reports").order_by("-date_joined")
    query = request.GET.get("q", "").strip()
    if query:
        users = users.filter(username__icontains=query) | users.filter(email__icontains=query)
    return render(request, "admin_panel/user_list.html", {"users": users, "query": query})


@staff_member_required
def user_detail(request, user_id):
    """
    Click on a user from the list -> see their full profile + every report
    they've uploaded (matched by their login/account, per the requirement).
    """
    target_user = get_object_or_404(User, pk=user_id)
    reports = Report.objects.filter(user=target_user).order_by("-uploaded_at")
    return render(
        request,
        "admin_panel/user_detail.html",
        {"target_user": target_user, "reports": reports},
    )


@staff_member_required
def user_delete(request, user_id):
    target_user = get_object_or_404(User, pk=user_id)
    if target_user == request.user:
        messages.error(request, "You cannot delete your own admin account from here.")
        return redirect("admin_panel:user_detail", user_id=user_id)

    if request.method == "POST":
        username = target_user.username
        # Deleting the user cascades to their Report rows (on_delete=CASCADE),
        # which in turn cascades to TestResult rows.
        target_user.delete()
        messages.success(request, f"User '{username}' and all their reports were deleted.")
        return redirect("admin_panel:user_list")

    return render(request, "admin_panel/confirm_delete_user.html", {"target_user": target_user})


@staff_member_required
def admin_delete_report(request, report_id):
    """Admin can delete any user's report."""
    report = get_object_or_404(Report, pk=report_id)
    user_id = report.user_id
    if request.method == "POST":
        report.pdf_file.delete(save=False)
        report.delete()
        messages.success(request, "Report deleted.")
        return redirect("admin_panel:user_detail", user_id=user_id)
    return render(request, "admin_panel/confirm_delete_report.html", {"report": report})
