from django.core.management.base import BaseCommand

from recommendations.models import ConditionMapping, GeneralRecommendation, MedicineStore
from reports.models import TestReference


class Command(BaseCommand):
    help = "Seed the database with sample TestReference, ConditionMapping and MedicineStore data."

    def handle(self, *args, **options):
        self._seed_test_references()
        self._seed_condition_mappings()
        self._seed_general_recommendation()
        self._seed_medicine_stores()
        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

    def _seed_test_references(self):
        data = [
            ("Hemoglobin", "HB, Hb", "g/dL", 13.0, 17.0),
            ("Glucose (Fasting)", "FBS, Fasting Blood Sugar, Glucose Fasting", "mg/dL", 70, 100),
            ("Total Cholesterol", "Cholesterol, Cholesterol Total", "mg/dL", 0, 200),
            ("WBC Count", "White Blood Cell Count, Total Leucocyte Count, TLC", "/uL", 4000, 11000),
            ("Creatinine", "Serum Creatinine", "mg/dL", 0.6, 1.3),
            ("Platelet Count", "Platelets", "/uL", 150000, 450000),
            ("TSH", "Thyroid Stimulating Hormone", "mIU/L", 0.4, 4.0),
            ("Vitamin D", "25-OH Vitamin D, Vitamin D3", "ng/mL", 30, 100),
        ]
        for name, aliases, unit, mn, mx in data:
            TestReference.objects.update_or_create(
                test_name=name,
                defaults={"aliases": aliases, "unit": unit, "normal_min": mn, "normal_max": mx},
            )
        self.stdout.write(f"  - {len(data)} TestReference rows")

    def _seed_condition_mappings(self):
        data = [
            dict(
                test_name="Glucose (Fasting)", direction="high",
                condition_name="Elevated Blood Sugar (Possible Pre-Diabetes/Diabetes)",
                description="Fasting glucose above the normal range can indicate insulin resistance or diabetes.",
                diet_advice="Reduce refined sugar and white rice/maida. Prefer whole grains, more fiber "
                             "(vegetables, legumes), and smaller, more frequent meals.",
                exercise_advice="30 minutes of brisk walking or cycling, 5 days a week. "
                                 "Post-meal short walks help lower blood sugar spikes.",
                common_medicines="Metformin",
                consult_specialty="Endocrinologist",
                severity_note="Confirm with HbA1c and a doctor's evaluation.",
            ),
            dict(
                test_name="Hemoglobin", direction="low",
                condition_name="Anemia (Low Hemoglobin)",
                description="Low hemoglobin may indicate iron-deficiency anemia or other causes.",
                diet_advice="Increase iron-rich foods: spinach, lentils, red meat, jaggery. "
                             "Pair with Vitamin C (citrus fruits) to improve iron absorption.",
                exercise_advice="Light-to-moderate activity such as walking or yoga; avoid overexertion until levels improve.",
                common_medicines="Iron supplements, Folic acid",
                consult_specialty="General Physician",
            ),
            dict(
                test_name="Total Cholesterol", direction="high",
                condition_name="High Cholesterol",
                description="Elevated cholesterol increases long-term cardiovascular risk.",
                diet_advice="Reduce fried/oily food and red meat. Add oats, nuts, and more fruits/vegetables. "
                             "Limit saturated fat.",
                exercise_advice="150 minutes/week of moderate cardio (brisk walk, swim, cycling).",
                common_medicines="Statins (e.g. Atorvastatin)",
                consult_specialty="Cardiologist",
            ),
            dict(
                test_name="WBC Count", direction="high",
                condition_name="Elevated White Blood Cell Count",
                description="Can indicate an infection or inflammation somewhere in the body.",
                diet_advice="Stay well hydrated; eat immunity-supportive foods (citrus fruits, garlic, turmeric).",
                exercise_advice="Rest is prioritized until the underlying cause is identified; avoid intense exercise.",
                common_medicines="Depends entirely on underlying cause — no general medicine recommended",
                consult_specialty="General Physician",
            ),
            dict(
                test_name="Creatinine", direction="high",
                condition_name="Elevated Creatinine (Possible Kidney Function Concern)",
                description="Higher-than-normal creatinine can indicate reduced kidney filtration.",
                diet_advice="Reduce salt and protein intake until evaluated by a doctor. Stay hydrated with plain water.",
                exercise_advice="Light activity; avoid dehydration-heavy workouts.",
                common_medicines="",
                consult_specialty="Nephrologist",
            ),
            dict(
                test_name="TSH", direction="high",
                condition_name="Possible Hypothyroidism",
                description="High TSH often indicates an underactive thyroid.",
                diet_advice="Include iodine-rich foods (iodized salt, dairy). Limit excess soy and cruciferous "
                             "vegetables in very large quantities.",
                exercise_advice="Moderate aerobic exercise 3-4 times/week to help manage metabolism and energy.",
                common_medicines="Levothyroxine",
                consult_specialty="Endocrinologist",
            ),
            dict(
                test_name="Vitamin D", direction="low",
                condition_name="Vitamin D Deficiency",
                description="Low Vitamin D affects bone health and immunity.",
                diet_advice="Include fortified dairy, egg yolks, and fatty fish. Get 15-20 minutes of morning sunlight.",
                exercise_advice="Weight-bearing exercises like walking, light resistance training for bone health.",
                common_medicines="Vitamin D3 supplements (cholecalciferol)",
                consult_specialty="General Physician",
            ),
        ]
        for row in data:
            ConditionMapping.objects.update_or_create(
                test_name=row["test_name"], direction=row["direction"], defaults=row
            )
        self.stdout.write(f"  - {len(data)} ConditionMapping rows")

    def _seed_general_recommendation(self):
        GeneralRecommendation.objects.update_or_create(
            title="Stay Healthy",
            defaults=dict(
                diet_advice="Maintain a balanced diet with plenty of vegetables, fruits, whole grains, "
                             "and lean protein. Limit processed food, added sugar, and excess salt. "
                             "Stay hydrated (2-3 liters of water/day).",
                exercise_advice="Aim for at least 150 minutes of moderate exercise per week "
                                 "(brisk walking, cycling, swimming), plus 2 days of strength training.",
                is_active=True,
            ),
        )
        self.stdout.write("  - 1 GeneralRecommendation row")

    def _seed_medicine_stores(self):
        data = [
            dict(medicine_name="Metformin", store_type="physical", store_name="Apollo Pharmacy",
                 address="MI Road, Jaipur, Rajasthan"),
            dict(medicine_name="Metformin", store_type="online", online_store_name="1mg",
                 product_url="https://www.1mg.com/search/all?name=Metformin"),
            dict(medicine_name="Iron supplements", store_type="online", online_store_name="PharmEasy",
                 product_url="https://pharmeasy.in/search/all?name=Iron+supplements"),
            dict(medicine_name="Vitamin D3 supplements (cholecalciferol)", store_type="online",
                 online_store_name="Netmeds",
                 product_url="https://www.netmeds.com/catalogsearch/result?q=Vitamin+D3"),
        ]
        for row in data:
            MedicineStore.objects.get_or_create(**row)
        self.stdout.write(f"  - {len(data)} MedicineStore rows")
