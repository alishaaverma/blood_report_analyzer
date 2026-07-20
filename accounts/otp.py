import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import PasswordOTP


class OTPRateLimited(Exception):
    pass


def issue_password_otp(user, purpose):
    """Invalidate older codes, create a hashed OTP, and email the plaintext once."""
    now = timezone.now()
    latest = PasswordOTP.objects.filter(user=user, purpose=purpose).first()
    if latest and latest.created_at > now - timedelta(seconds=60):
        raise OTPRateLimited("Please wait one minute before requesting another code.")
    if (
        PasswordOTP.objects.filter(
            user=user,
            purpose=purpose,
            created_at__gte=now - timedelta(hours=1),
        ).count()
        >= 5
    ):
        raise OTPRateLimited("Too many codes requested. Please try again in one hour.")

    PasswordOTP.objects.filter(
        user=user, purpose=purpose, used_at__isnull=True
    ).update(used_at=now)

    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = PasswordOTP(
        user=user,
        purpose=purpose,
        expires_at=now + timedelta(minutes=settings.PASSWORD_OTP_EXPIRY_MINUTES),
    )
    otp.set_code(code)
    otp.save()

    subject = (
        "Password reset verification code"
        if purpose == PasswordOTP.PURPOSE_FORGOT
        else "Password change verification code"
    )
    send_mail(
        subject=subject,
        message=(
            f"Your Blood Report Analyzer verification code is {code}.\n\n"
            f"It expires in {settings.PASSWORD_OTP_EXPIRY_MINUTES} minutes. "
            "Do not share this code with anyone. If you did not request it, "
            "you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return otp
