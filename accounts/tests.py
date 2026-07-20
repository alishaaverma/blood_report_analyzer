import json
import re
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import PasswordOTP


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_OTP_EXPIRY_MINUTES=10,
)
class PasswordOTPFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="otp-user",
            email="otp@example.com",
            password="Old-password-2026!",
        )

    def _latest_code(self):
        match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(match)
        return match.group(1)

    def test_forgot_password_requires_email_otp(self):
        response = self.client.post(
            reverse("accounts:forgot_password"),
            {"email": self.user.email},
        )
        self.assertRedirects(
            response,
            reverse(
                "accounts:password_otp_verify",
                kwargs={"purpose": PasswordOTP.PURPOSE_FORGOT},
            ),
        )
        self.assertEqual(len(mail.outbox), 1)
        code = self._latest_code()
        otp = PasswordOTP.objects.get(user=self.user)
        self.assertNotIn(code, otp.code_hash)

        response = self.client.post(
            reverse(
                "accounts:password_otp_verify",
                kwargs={"purpose": PasswordOTP.PURPOSE_FORGOT},
            ),
            {"code": code},
        )
        self.assertRedirects(
            response,
            reverse(
                "accounts:set_new_password",
                kwargs={"purpose": PasswordOTP.PURPOSE_FORGOT},
            ),
        )

        response = self.client.post(
            reverse(
                "accounts:set_new_password",
                kwargs={"purpose": PasswordOTP.PURPOSE_FORGOT},
            ),
            {
                "new_password1": "New-complex-password-2026!",
                "new_password2": "New-complex-password-2026!",
            },
        )
        self.assertRedirects(response, reverse("accounts:login"))
        self.assertIsNotNone(
            authenticate(
                username=self.user.username,
                password="New-complex-password-2026!",
            )
        )

    def test_profile_password_change_keeps_user_signed_in(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("accounts:change_password"))
        self.assertEqual(response.status_code, 302)
        code = self._latest_code()

        self.client.post(
            reverse(
                "accounts:password_otp_verify",
                kwargs={"purpose": PasswordOTP.PURPOSE_CHANGE},
            ),
            {"code": code},
        )
        response = self.client.post(
            reverse(
                "accounts:set_new_password",
                kwargs={"purpose": PasswordOTP.PURPOSE_CHANGE},
            ),
            {
                "new_password1": "Changed-password-2026!",
                "new_password2": "Changed-password-2026!",
            },
        )

        self.assertRedirects(response, reverse("accounts:profile"))
        self.assertIn("_auth_user_id", self.client.session)

    def test_incorrect_otp_increments_attempt_count(self):
        self.client.post(
            reverse("accounts:forgot_password"),
            {"email": self.user.email},
        )
        self.client.post(
            reverse(
                "accounts:password_otp_verify",
                kwargs={"purpose": PasswordOTP.PURPOSE_FORGOT},
            ),
            {"code": "000000"},
        )

        otp = PasswordOTP.objects.get(user=self.user)
        self.assertEqual(otp.failed_attempts, 1)

    def test_unknown_email_does_not_reveal_account_existence(self):
        response = self.client.post(
            reverse("accounts:forgot_password"),
            {"email": "missing@example.com"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_code_is_rate_limited_then_sends_new_code(self):
        self.client.post(
            reverse("accounts:forgot_password"),
            {"email": self.user.email},
        )
        resend_url = reverse(
            "accounts:resend_password_otp",
            kwargs={"purpose": PasswordOTP.PURPOSE_FORGOT},
        )

        response = self.client.post(resend_url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(len(mail.outbox), 1)

        PasswordOTP.objects.filter(user=self.user).update(
            created_at=timezone.now() - timedelta(seconds=61)
        )
        response = self.client.post(resend_url)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(
            PasswordOTP.objects.filter(user=self.user, used_at__isnull=True).count(),
            1,
        )


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_OTP_EXPIRY_MINUTES=10,
)
class PasswordOTPApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="api-user",
            email="api@example.com",
            password="Old-password-2026!",
        )

    def _code(self):
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

    def test_forgot_password_api_end_to_end(self):
        response = self.client.post(
            reverse("accounts:api_forgot_send_otp"),
            data='{"email":"api@example.com"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["delivery_mode"], "development_terminal")

        response = self.client.post(
            reverse("accounts:api_verify_password_otp"),
            data=json.dumps(
                {"purpose": PasswordOTP.PURPOSE_FORGOT, "code": self._code()}
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            reverse("accounts:api_set_new_password"),
            data=json.dumps(
                {
                    "purpose": PasswordOTP.PURPOSE_FORGOT,
                    "new_password1": "Api-new-password-2026!",
                    "new_password2": "Api-new-password-2026!",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(
            authenticate(
                username=self.user.username,
                password="Api-new-password-2026!",
            )
        )

    def test_change_password_send_api_requires_login(self):
        response = self.client.post(
            reverse("accounts:api_change_send_otp"),
            data="{}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_change_password_api_sends_otp_for_logged_in_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("accounts:api_change_send_otp"),
            data="{}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
