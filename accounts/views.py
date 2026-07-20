import json
from smtplib import SMTPException

from django.contrib.auth import login
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView, LogoutView
from django.contrib import messages
from django.conf import settings
from django.core.mail import BadHeaderError
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views import View

from locator.utils import reverse_geocode_place

from .forms import (
    EmailOTPRequestForm,
    OTPSetPasswordForm,
    OTPVerificationForm,
    ProfileForm,
    SignUpForm,
)
from .models import PasswordOTP
from .otp import OTPRateLimited, issue_password_otp


OTP_SESSION_ID = "password_otp_id"
OTP_SESSION_USER = "password_otp_user_id"
OTP_SESSION_PURPOSE = "password_otp_purpose"
OTP_SESSION_VERIFIED = "password_otp_verified"
OTP_SESSION_VERIFIED_AT = "password_otp_verified_at"


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
    location = reverse_geocode_place(lat, lng)
    profile.current_place_name = location["place_name"]
    profile.current_full_address = location["full_address"]
    profile.last_location_updated = timezone.now()
    profile.save()
    return JsonResponse(
        {
            "status": "ok",
            "latitude": profile.last_latitude,
            "longitude": profile.last_longitude,
            "place_name": profile.current_place_name or "Place name unavailable",
            "full_address": profile.current_full_address or "Address unavailable",
            "updated_at": timezone.localtime(
                profile.last_location_updated
            ).strftime("%d %b %Y, %H:%M"),
        }
    )


def forgot_password_request(request):
    if request.user.is_authenticated:
        return redirect("accounts:profile")

    form = EmailOTPRequestForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        email = form.cleaned_data["email"].strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        _clear_password_otp_session(request)
        request.session[OTP_SESSION_PURPOSE] = PasswordOTP.PURPOSE_FORGOT

        if user and user.email:
            try:
                otp = issue_password_otp(user, PasswordOTP.PURPOSE_FORGOT)
            except OTPRateLimited as exc:
                form.add_error(None, str(exc))
                return render(
                    request, "accounts/password_otp_request.html", {"form": form}
                )
            except (OSError, SMTPException, BadHeaderError):
                form.add_error(
                    None, "The verification email could not be sent. Try again later."
                )
                return render(
                    request, "accounts/password_otp_request.html", {"form": form}
                )
            request.session[OTP_SESSION_ID] = otp.pk
            request.session[OTP_SESSION_USER] = user.pk

        messages.info(
            request,
            "If an active account uses that email, a 6-digit code has been sent.",
        )
        _add_email_backend_notice(request)
        return redirect(
            "accounts:password_otp_verify",
            purpose=PasswordOTP.PURPOSE_FORGOT,
        )
    return render(request, "accounts/password_otp_request.html", {"form": form})


@login_required
def change_password_request(request):
    if request.method == "POST":
        if not request.user.email:
            messages.error(
                request, "Add an email address to your account before changing password."
            )
            return redirect("accounts:profile")
        _clear_password_otp_session(request)
        try:
            otp = issue_password_otp(request.user, PasswordOTP.PURPOSE_CHANGE)
        except OTPRateLimited as exc:
            messages.error(request, str(exc))
            return redirect("accounts:profile")
        except (OSError, SMTPException, BadHeaderError):
            messages.error(
                request, "The verification email could not be sent. Try again later."
            )
            return redirect("accounts:profile")

        request.session[OTP_SESSION_ID] = otp.pk
        request.session[OTP_SESSION_USER] = request.user.pk
        request.session[OTP_SESSION_PURPOSE] = PasswordOTP.PURPOSE_CHANGE
        messages.info(request, f"A 6-digit code was sent to {request.user.email}.")
        _add_email_backend_notice(request)
        return redirect(
            "accounts:password_otp_verify",
            purpose=PasswordOTP.PURPOSE_CHANGE,
        )
    return render(request, "accounts/change_password_request.html")


def password_otp_verify(request, purpose):
    if purpose not in (PasswordOTP.PURPOSE_FORGOT, PasswordOTP.PURPOSE_CHANGE):
        return redirect("accounts:login")
    if purpose == PasswordOTP.PURPOSE_CHANGE and not request.user.is_authenticated:
        return redirect("accounts:login")
    if request.session.get(OTP_SESSION_PURPOSE) != purpose:
        return redirect(
            "accounts:forgot_password"
            if purpose == PasswordOTP.PURPOSE_FORGOT
            else "accounts:change_password"
        )

    form = OTPVerificationForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        otp = PasswordOTP.objects.filter(
            pk=request.session.get(OTP_SESSION_ID),
            user_id=request.session.get(OTP_SESSION_USER),
            purpose=purpose,
        ).first()
        if not otp or otp.failed_attempts >= 5:
            form.add_error(None, "This code is invalid or no longer available.")
        elif otp.verify(form.cleaned_data["code"]):
            otp.mark_used()
            request.session[OTP_SESSION_VERIFIED] = True
            request.session[OTP_SESSION_VERIFIED_AT] = timezone.now().timestamp()
            request.session.pop(OTP_SESSION_ID, None)
            return redirect(
                "accounts:set_new_password",
                purpose=purpose,
            )
        else:
            otp.failed_attempts += 1
            otp.save(update_fields=["failed_attempts"])
            form.add_error(None, "Incorrect or expired code.")

    return render(
        request,
        "accounts/password_otp_verify.html",
        {"form": form, "purpose": purpose},
    )


def resend_password_otp(request, purpose):
    if request.method != "POST":
        return redirect(
            "accounts:password_otp_verify",
            purpose=purpose,
        )
    if (
        purpose not in (PasswordOTP.PURPOSE_FORGOT, PasswordOTP.PURPOSE_CHANGE)
        or request.session.get(OTP_SESSION_PURPOSE) != purpose
    ):
        return redirect("accounts:login")

    user = User.objects.filter(pk=request.session.get(OTP_SESSION_USER)).first()
    if not user:
        messages.info(
            request,
            "If an active account uses that email, a new code has been sent.",
        )
        return redirect("accounts:password_otp_verify", purpose=purpose)
    if purpose == PasswordOTP.PURPOSE_CHANGE and request.user != user:
        _clear_password_otp_session(request)
        return redirect("accounts:login")

    try:
        otp = issue_password_otp(user, purpose)
    except OTPRateLimited as exc:
        messages.error(request, str(exc))
    except (OSError, SMTPException, BadHeaderError):
        messages.error(
            request,
            "The verification email could not be sent. Check the email settings "
            "or try again later.",
        )
    else:
        request.session[OTP_SESSION_ID] = otp.pk
        request.session.pop(OTP_SESSION_VERIFIED, None)
        request.session.pop(OTP_SESSION_VERIFIED_AT, None)
        messages.success(request, f"A new code was sent to {user.email}.")
        _add_email_backend_notice(request)

    return redirect("accounts:password_otp_verify", purpose=purpose)


def set_new_password(request, purpose):
    verified_at = request.session.get(OTP_SESSION_VERIFIED_AT, 0)
    verification_is_fresh = (
        timezone.now().timestamp() - verified_at
        <= 60 * 10
    )
    if (
        purpose not in (PasswordOTP.PURPOSE_FORGOT, PasswordOTP.PURPOSE_CHANGE)
        or request.session.get(OTP_SESSION_PURPOSE) != purpose
        or not request.session.get(OTP_SESSION_VERIFIED)
        or not verification_is_fresh
    ):
        return redirect("accounts:login")

    user = User.objects.filter(pk=request.session.get(OTP_SESSION_USER)).first()
    if not user:
        _clear_password_otp_session(request)
        return redirect("accounts:login")
    if purpose == PasswordOTP.PURPOSE_CHANGE and request.user != user:
        _clear_password_otp_session(request)
        return redirect("accounts:login")

    form = OTPSetPasswordForm(user, request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        _clear_password_otp_session(request)
        if purpose == PasswordOTP.PURPOSE_CHANGE:
            update_session_auth_hash(request, user)
            messages.success(request, "Your password was changed successfully.")
            return redirect("accounts:profile")
        messages.success(request, "Your password was reset. You can now sign in.")
        return redirect("accounts:login")
    return render(
        request,
        "accounts/set_new_password.html",
        {"form": form, "purpose": purpose},
    )


def _clear_password_otp_session(request):
    for key in (
        OTP_SESSION_ID,
        OTP_SESSION_USER,
        OTP_SESSION_PURPOSE,
        OTP_SESSION_VERIFIED,
        OTP_SESSION_VERIFIED_AT,
    ):
        request.session.pop(key, None)


def _add_email_backend_notice(request):
    if settings.EMAIL_BACKEND.endswith("console.EmailBackend"):
        messages.warning(
            request,
            "Development email mode is active: the OTP was printed in the Django "
            "server terminal and was not delivered to an inbox. Configure SMTP in "
            ".env for real email delivery.",
        )
