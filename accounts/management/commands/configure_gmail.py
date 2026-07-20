from getpass import getpass
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMessage
from django.core.mail.backends.smtp import EmailBackend
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.core.exceptions import ValidationError


class Command(BaseCommand):
    help = "Securely configure Gmail SMTP credentials in the local .env file."

    def handle(self, *args, **options):
        self.stdout.write(
            "Use a 16-character Google App Password, not your normal Gmail password."
        )
        email = input("Gmail address: ").strip()
        try:
            validate_email(email)
        except ValidationError as exc:
            raise CommandError("Enter a valid Gmail address.") from exc
        if not email.lower().endswith("@gmail.com"):
            raise CommandError("This setup command accepts Gmail addresses only.")

        app_password = getpass("Google App Password (hidden): ").replace(" ", "")
        if len(app_password) != 16:
            raise CommandError("A Google App Password must contain 16 characters.")

        env_path = Path(settings.BASE_DIR) / ".env"
        self._update_env(
            env_path,
            {
                "EMAIL_BACKEND": "auto",
                "EMAIL_HOST": "smtp.gmail.com",
                "EMAIL_PORT": "587",
                "EMAIL_USE_TLS": "True",
                "EMAIL_HOST_USER": email,
                "EMAIL_HOST_PASSWORD": app_password,
                "DEFAULT_FROM_EMAIL": email,
            },
        )

        self.stdout.write("Testing Gmail SMTP delivery...")
        connection = EmailBackend(
            host="smtp.gmail.com",
            port=587,
            username=email,
            password=app_password,
            use_tls=True,
            timeout=15,
        )
        try:
            sent = EmailMessage(
                subject="Blood Report Analyzer email test",
                body=(
                    "Gmail delivery is configured successfully. Password OTPs "
                    "will now be delivered to users by email."
                ),
                from_email=email,
                to=[email],
                connection=connection,
            ).send()
        except Exception as exc:
            raise CommandError(
                "Credentials were saved, but Gmail rejected the test. Confirm "
                "that 2-Step Verification is enabled and generate a new App Password."
            ) from exc
        finally:
            connection.close()

        if sent != 1:
            raise CommandError("Gmail did not confirm delivery of the test message.")
        self.stdout.write(
            self.style.SUCCESS(
                "Gmail SMTP is configured and a test email was sent successfully. "
                "Restart the Django server."
            )
        )

    @staticmethod
    def _update_env(path, values):
        lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
        pending = dict(values)
        updated = []
        for line in lines:
            if "=" in line and not line.lstrip().startswith("#"):
                key = line.split("=", 1)[0].strip()
                if key in pending:
                    updated.append(f"{key}={pending.pop(key)}")
                    continue
            updated.append(line)
        if pending:
            if updated and updated[-1]:
                updated.append("")
            updated.extend(f"{key}={value}" for key, value in pending.items())
        path.write_text("\n".join(updated) + "\n", encoding="utf-8")
