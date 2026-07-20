from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_passwordotp"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="passwordotp",
            old_name="accounts_pa_user_id_d12f10_idx",
            new_name="accounts_pa_user_id_196d2d_idx",
        ),
    ]
