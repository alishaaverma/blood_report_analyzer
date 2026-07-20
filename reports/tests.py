from django.test import SimpleTestCase

from .views import _age_based_guidance


class AgeBasedGuidanceTests(SimpleTestCase):
    def test_missing_age_requests_profile_update(self):
        guidance = _age_based_guidance(None)
        self.assertEqual(guidance["label"], "Age not provided")

    def test_minor_gets_child_guidance(self):
        guidance = _age_based_guidance(12)
        self.assertIn("Child or adolescent", guidance["label"])
        self.assertIn("pediatrician", guidance["care"])

    def test_young_child_gets_active_play_guidance(self):
        guidance = _age_based_guidance(4)
        self.assertEqual(guidance["label"], "Young child (4 years)")
        self.assertIn("active play", guidance["activity"])

    def test_adult_gets_adult_guidance(self):
        guidance = _age_based_guidance(40)
        self.assertEqual(guidance["label"], "Adult (40 years)")
        self.assertIn("150 minutes", guidance["activity"])

    def test_older_adult_gets_balance_guidance(self):
        guidance = _age_based_guidance(70)
        self.assertEqual(guidance["label"], "Older adult (70 years)")
        self.assertIn("balance", guidance["activity"])
