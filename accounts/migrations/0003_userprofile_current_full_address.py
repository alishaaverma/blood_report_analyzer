from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_userprofile_current_place_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="current_full_address",
            field=models.TextField(blank=True),
        ),
    ]
