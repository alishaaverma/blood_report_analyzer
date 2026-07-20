import json

from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView, LogoutView
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views import View

from .forms import ProfileForm, SignUpForm


class SignUpView(View):
    template_name = "accounts/signup.html"

    def get(self, request):
        return render(request, self.template_name, {"form": SignUpForm()})

    def post(self, request):
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("reports:dashboard")
        return render(request, self.template_name, {"form": form})


class UserLoginView(LoginView):
    template_name = "accounts/login.html"
    redirect_authenticated_user = True


class UserLogoutView(LogoutView):
    next_page = "accounts:login"


@login_required
def profile_view(request):
    profile = request.user.profile
    if request.method == "POST":
        form = ProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            return redirect("accounts:profile")
    else:
        form = ProfileForm(instance=profile)
    return render(request, "accounts/profile.html", {"form": form, "profile": profile})


@login_required
def update_location(request):
    """AJAX endpoint: browser sends lat/lng from navigator.geolocation."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        lat = float(data["latitude"])
        lng = float(data["longitude"])
    except (KeyError, ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({"error": "Invalid coordinates"}, status=400)

    profile = request.user.profile
    profile.last_latitude = lat
    profile.last_longitude = lng
    profile.last_location_updated = timezone.now()
    profile.save()
    return JsonResponse({"status": "ok"})
