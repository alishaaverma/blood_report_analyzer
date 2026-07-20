import json
from smtplib import SMTPException

from django.conf import settings
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import User
from django.core.mail import BadHeaderError
from django.http import JsonResponse
from django.urls import reverse
from django.utils import timezone

from .forms import OTPSetPasswordForm
from .models import PasswordOTP
from .otp import OTPRateLimited, issue_password_otp
from .views import (
    OTP_SESSION_ID,
    OTP_SESSION_PURPOSE,
    OTP_SESSION_USER,
    OTP_SESSION_VERIFIED,
    OTP_SESSION_VERIFIED_AT,
    _clear_password_otp_session,
)


def forgot_password_send_otp_api(request):
    if request.method != "POST":
        return _method_not_allowed()
    if request.user.is_authenticated:
        return JsonResponse({"error": "Sign out before resetting your password."}, status=400)

    data = _json_body(request)
    email = str(data.get("email", "")).strip()
    if "@" not in email:
        return JsonResponse({"error": "Enter a valid email address."}, status=400)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    _clear_password_otp_session(request)
    request.session[OTP_SESSION_PURPOSE] = PasswordOTP.PURPOSE_FORGOT

    if user and user.email:
        error = _issue_and_store_otp(request, user, PasswordOTP.PURPOSE_FORGOT)
        if error:
            return error

    return JsonResponse(
        {
            "message": (
                "If an active account uses that email, a 6-digit code has been sent."
            ),
            "delivery_mode": _delivery_mode(),
            "next_url": reverse(
                "accounts:password_otp_verify",
                kwargs={"purpose": PasswordOTP.PURPOSE_FORGOT},
            ),
        }
    )


def change_password_send_otp_api(request):
    if request.method != "POST":
        return _method_not_allowed()
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not request.user.email:
        return JsonResponse(
            {"error": "Add an email address to your account first."}, status=400
        )

    _clear_password_otp_session(request)
    error = _issue_and_store_otp(
        request, request.user, PasswordOTP.PURPOSE_CHANGE
    )
    if error:
        return error
    return JsonResponse(
        {
            "message": f"A 6-digit code was sent to {request.user.email}.",
            "delivery_mode": _delivery_mode(),
            "next_url": reverse(
                "accounts:password_otp_verify",
                kwargs={"purpose": PasswordOTP.PURPOSE_CHANGE},
            ),
        }
    )


def verify_password_otp_api(request):
    if request.method != "POST":
        return _method_not_allowed()
    data = _json_body(request)
    purpose = data.get("purpose")
    code = str(data.get("code", "")).strip()
    if purpose not in (PasswordOTP.PURPOSE_FORGOT, PasswordOTP.PURPOSE_CHANGE):
        return JsonResponse({"error": "Invalid password operation."}, status=400)
    if not (len(code) == 6 and code.isdigit()):
        return JsonResponse({"error": "Enter a valid 6-digit code."}, status=400)
    if request.session.get(OTP_SESSION_PURPOSE) != purpose:
        return JsonResponse({"error": "Request a new code first."}, status=400)

    otp = PasswordOTP.objects.filter(
        pk=request.session.get(OTP_SESSION_ID),
        user_id=request.session.get(OTP_SESSION_USER),
        purpose=purpose,
    ).first()
    if not otp or otp.failed_attempts >= 5:
        return JsonResponse(
            {"error": "This code is invalid or no longer available."}, status=400
        )
    if not otp.verify(code):
        otp.failed_attempts += 1
        otp.save(update_fields=["failed_attempts"])
        return JsonResponse({"error": "Incorrect or expired code."}, status=400)

    otp.mark_used()
    request.session[OTP_SESSION_VERIFIED] = True
    request.session[OTP_SESSION_VERIFIED_AT] = timezone.now().timestamp()
    request.session.pop(OTP_SESSION_ID, None)
    return JsonResponse(
        {
            "message": "Email verification successful.",
            "next_url": reverse(
                "accounts:set_new_password",
                kwargs={"purpose": purpose},
            ),
        }
    )


def resend_password_otp_api(request):
    if request.method != "POST":
        return _method_not_allowed()
    data = _json_body(request)
    purpose = data.get("purpose")
    if (
        purpose not in (PasswordOTP.PURPOSE_FORGOT, PasswordOTP.PURPOSE_CHANGE)
        or request.session.get(OTP_SESSION_PURPOSE) != purpose
    ):
        return JsonResponse({"error": "Request a password code first."}, status=400)

    user = User.objects.filter(pk=request.session.get(OTP_SESSION_USER)).first()
    if not user:
        return JsonResponse(
            {
                "message": (
                    "If an active account uses that email, a new code has been sent."
                ),
                "delivery_mode": _delivery_mode(),
            }
        )
    if purpose == PasswordOTP.PURPOSE_CHANGE and request.user != user:
        return JsonResponse({"error": "Authentication required."}, status=401)

    error = _issue_and_store_otp(request, user, purpose)
    if error:
        return error
    request.session.pop(OTP_SESSION_VERIFIED, None)
    request.session.pop(OTP_SESSION_VERIFIED_AT, None)
    return JsonResponse(
        {
            "message": f"A new code was sent to {user.email}.",
            "delivery_mode": _delivery_mode(),
        }
    )


def set_new_password_api(request):
    if request.method != "POST":
        return _method_not_allowed()
    data = _json_body(request)
    purpose = data.get("purpose")
    verified_at = request.session.get(OTP_SESSION_VERIFIED_AT, 0)
    if (
        purpose not in (PasswordOTP.PURPOSE_FORGOT, PasswordOTP.PURPOSE_CHANGE)
        or request.session.get(OTP_SESSION_PURPOSE) != purpose
        or not request.session.get(OTP_SESSION_VERIFIED)
        or timezone.now().timestamp() - verified_at > 600
    ):
        return JsonResponse({"error": "Verify a new email code first."}, status=403)

    user = User.objects.filter(pk=request.session.get(OTP_SESSION_USER)).first()
    if not user:
        _clear_password_otp_session(request)
        return JsonResponse({"error": "Password request expired."}, status=403)
    if purpose == PasswordOTP.PURPOSE_CHANGE and request.user != user:
        _clear_password_otp_session(request)
        return JsonResponse({"error": "Authentication required."}, status=401)

    form = OTPSetPasswordForm(
        user,
        {
            "new_password1": data.get("new_password1", ""),
            "new_password2": data.get("new_password2", ""),
        },
    )
    if not form.is_valid():
        errors = [
            message
            for field_errors in form.errors.values()
            for message in field_errors
        ]
        return JsonResponse({"error": " ".join(errors)}, status=400)

    form.save()
    _clear_password_otp_session(request)
    if purpose == PasswordOTP.PURPOSE_CHANGE:
        update_session_auth_hash(request, user)
        next_url = reverse("accounts:profile")
    else:
        next_url = reverse("accounts:login")
    return JsonResponse(
        {"message": "Password updated successfully.", "next_url": next_url}
    )


def _issue_and_store_otp(request, user, purpose):
    try:
        otp = issue_password_otp(user, purpose)
    except OTPRateLimited as exc:
        return JsonResponse({"error": str(exc)}, status=429)
    except (OSError, SMTPException, BadHeaderError):
        return JsonResponse(
            {
                "error": (
                    "The OTP email could not be sent. Check SMTP settings and try again."
                )
            },
            status=503,
        )
    request.session[OTP_SESSION_ID] = otp.pk
    request.session[OTP_SESSION_USER] = user.pk
    request.session[OTP_SESSION_PURPOSE] = purpose
    return None


def _json_body(request):
    try:
        return json.loads(request.body or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}


def _delivery_mode():
    return (
        "email"
        if settings.EMAIL_BACKEND.endswith("smtp.EmailBackend")
        else "development_terminal"
    )


def _method_not_allowed():
    return JsonResponse({"error": "POST required."}, status=405)
