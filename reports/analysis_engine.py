"""
Rule-based analysis engine.

Takes the parsed line-items from a PDF and:
1. Matches each to a TestReference (by exact name or alias) to get the
   "official" normal range (falls back to the range printed on the report
   itself if no master TestReference exists yet).
2. Flags each result as normal / high / low.
3. Saves TestResult rows.
4. Sets the overall Report.status.

This is intentionally rule-based (not ML) so every decision is transparent
and explainable — important for anything health-related.
"""
from django.utils import timezone

from recommendations.models import ConditionMapping
from reports.models import Report, TestReference, TestResult


def _find_reference(test_name):
    name_lower = test_name.strip().lower()
    for ref in TestReference.objects.all():
        if ref.test_name.strip().lower() == name_lower:
            return ref
        if name_lower in ref.alias_list():
            return ref
    return None


def analyze_report(report: Report, parsed_lines: list[dict]):
    """
    parsed_lines: output of pdf_parser.parse_test_lines()
    Persists TestResult rows and updates report.status.
    """
    report.results.all().delete()  # re-analysis support

    any_abnormal = False
    created = []

    for item in parsed_lines:
        reference = _find_reference(item["test_name"])

        if reference:
            normal_min, normal_max = reference.normal_min, reference.normal_max
        else:
            # No master reference yet — use the range printed on the PDF itself, if present.
            normal_min, normal_max = item.get("ref_min"), item.get("ref_max")

        is_abnormal = False
        if normal_min is not None and normal_max is not None:
            is_abnormal = not (normal_min <= item["value"] <= normal_max)

        result = TestResult.objects.create(
            report=report,
            test_name=reference.test_name if reference else item["test_name"],
            value=item["value"],
            unit=item["unit"] or (reference.unit if reference else ""),
            normal_min=normal_min,
            normal_max=normal_max,
            is_abnormal=is_abnormal,
            matched_reference=reference,
        )
        created.append(result)
        if is_abnormal:
            any_abnormal = True

    report.status = Report.STATUS_ABNORMAL if any_abnormal else Report.STATUS_NORMAL
    report.analyzed_at = timezone.now()
    report.save()

    return created


def get_condition_mappings_for_report(report: Report):
    """Return list of ConditionMapping objects relevant to this report's abnormal results."""
    mappings = []
    for result in report.abnormal_results:
        direction = result.direction
        if direction not in ("high", "low"):
            continue
        mapping = ConditionMapping.objects.filter(
            test_name__iexact=result.test_name, direction=direction
        ).first()
        if mapping:
            mappings.append(mapping)
    return mappings
