import { conditionMappings, testReferences } from "@/lib/seed";
import type { ConditionMapping, Report, TestResult } from "@/lib/types";

const linePattern =
  /^(?<name>[A-Za-z][A-Za-z0-9()/%.,\-\s]{2,60}?)\s+(?<value>-?\d+(?:\.\d+)?)\s*(?<unit>[a-zA-Z%/µμ]{1,15}(?:\/[a-zA-Z]+)?)?\s*(?:[:\-]?\s*(?<min>\d+(?:\.\d+)?)\s*-\s*(?<max>\d+(?:\.\d+)?))?\s*$/;

interface ParsedLine {
  testName: string;
  value: number;
  unit: string;
  refMin: number | null;
  refMax: number | null;
}

export function parseTestLines(rawText: string): ParsedLine[] {
  return rawText.split(/\r?\n/).flatMap((rawLine) => {
    const line = rawLine.trim();
    const match = line.match(linePattern);
    if (!match?.groups) return [];
    const testName = match.groups.name.trim().replace(/[ .:\-]+$/, "");
    if (["test", "parameter", "investigation"].includes(testName.toLowerCase()))
      return [];
    return [
      {
        testName,
        value: Number(match.groups.value),
        unit: match.groups.unit?.trim() ?? "",
        refMin: match.groups.min ? Number(match.groups.min) : null,
        refMax: match.groups.max ? Number(match.groups.max) : null,
      },
    ];
  });
}

export function analyzeLines(lines: ParsedLine[]): TestResult[] {
  return lines.map((line) => {
    const normalized = line.testName.toLowerCase();
    const reference = testReferences.find(
      (item) =>
        item.testName.toLowerCase() === normalized || item.aliases.includes(normalized),
    );
    const normalMin = reference?.normalMin ?? line.refMin;
    const normalMax = reference?.normalMax ?? line.refMax;
    const direction =
      normalMin === null || normalMax === null
        ? "unknown"
        : line.value < normalMin
          ? "low"
          : line.value > normalMax
            ? "high"
            : "normal";
    return {
      testName: reference?.testName ?? line.testName,
      value: line.value,
      unit: line.unit || reference?.unit || "",
      normalMin,
      normalMax,
      isAbnormal: direction === "high" || direction === "low",
      direction,
    };
  });
}

export function mappingsForReport(report: Report): ConditionMapping[] {
  return report.results.flatMap((result) => {
    if (result.direction !== "high" && result.direction !== "low") return [];
    const match = conditionMappings.find(
      (mapping) =>
        mapping.testName.toLowerCase() === result.testName.toLowerCase() &&
        mapping.direction === result.direction,
    );
    return match ? [match] : [];
  });
}

export function ageGuidance(age: number | null) {
  if (age === null)
    return {
      label: "Age not provided",
      diet: "Add your age in your profile for age-appropriate context. Confirm significant diet changes with a healthcare professional.",
      activity:
        "Choose activity suitable for your current fitness and health, and stop with chest pain, faintness, or unusual breathlessness.",
      care: "A doctor can recommend a safer plan after considering your age and medical history.",
    };
  if (age < 6)
    return {
      label: `Young child (${age} years)`,
      diet: "Children need adequate energy and nutrients for growth. A parent or guardian should discuss diet changes with a pediatrician.",
      activity:
        "Varied active play is generally appropriate; ask a pediatrician whether this result requires restrictions.",
      care: "Review the result promptly with a pediatrician and involve a parent or guardian in every decision.",
    };
  if (age < 18)
    return {
      label: `Child or adolescent (${age} years)`,
      diet: "Avoid restrictive diets unless a pediatrician or qualified dietitian recommends one.",
      activity:
        "Young people generally benefit from daily activity, but ask a pediatrician whether an abnormal result requires limits.",
      care: "Review the result with a pediatrician and involve a parent or guardian in follow-up.",
    };
  if (age < 65)
    return {
      label: `Adult (${age} years)`,
      diet: "Use condition-specific guidance as part of a balanced diet and confirm changes if you have other conditions or take medicine.",
      activity:
        "When medically safe, adults generally aim for 150 minutes of moderate activity weekly plus strength work on two days.",
      care: "Arrange follow-up with the recommended clinician, who can consider symptoms, medicines, and medical history.",
    };
  return {
    label: `Older adult (${age} years)`,
    diet: "Maintain adequate food, protein, and fluids unless your clinician has restricted them, and check for medicine interactions.",
    activity:
      "Prioritize fall safety and add balance work to comfortable aerobic and strength activity when medically safe.",
    care: "Arrange clinical review, especially with multiple medicines, long-term conditions, or new symptoms.",
  };
}
