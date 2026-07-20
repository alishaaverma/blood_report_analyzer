from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recommendations", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="conditionmapping",
            name="diet_advice",
            field=models.TextField(
                help_text="Diet guidance specifically related to this condition."
            ),
        ),
        migrations.AlterField(
            model_name="conditionmapping",
            name="exercise_advice",
            field=models.TextField(
                help_text="Exercise guidance specifically related to this condition."
            ),
        ),
    ]
