from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import ConditionMapping


class ConditionMappingMedicineTests(TestCase):
    def test_medicine_list_is_limited_to_five(self):
        mapping = ConditionMapping(
            common_medicines="One, Two, Three, Four, Five, Six"
        )
        self.assertEqual(
            mapping.medicine_list(),
            ["One", "Two", "Three", "Four", "Five"],
        )

    def test_no_general_medicine_text_is_not_treated_as_medicine(self):
        mapping = ConditionMapping(
            common_medicines=(
                "Depends entirely on underlying cause — no general medicine recommended"
            )
        )
        self.assertEqual(mapping.medicine_list(), [])

    def test_condition_requires_related_diet_and_exercise_guidance(self):
        mapping = ConditionMapping(
            test_name="Example Test",
            direction="high",
            condition_name="Example Condition",
            diet_advice="",
            exercise_advice="",
            consult_specialty="General Physician",
        )

        with self.assertRaises(ValidationError) as error:
            mapping.full_clean()

        self.assertIn("diet_advice", error.exception.message_dict)
        self.assertIn("exercise_advice", error.exception.message_dict)
