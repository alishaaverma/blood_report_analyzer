import type { DailyHealthLog, HealthTrackerProfile } from "@/lib/types";

export interface DailyReportMetric {
  key: "steps" | "water" | "meals" | "exercise" | "routine";
  label: string;
  value: number;
  goal: number;
  displayValue: string;
  displayGoal: string;
  percentage: number;
}

export interface DailyHealthReport {
  date: string;
  score: number;
  result:
    | "No tracker data"
    | "Limited data"
    | "Needs consistency"
    | "Building consistency"
    | "Good progress"
    | "Strong consistency";
  summary: string;
  trackedAreas: number;
  metrics: DailyReportMetric[];
  suggestions: string[];
  updatedAt: string;
}

function percentage(value: number, goal: number) {
  return Math.min(100, Math.round((value / Math.max(goal, 1)) * 100));
}

export function buildDailyHealthReport(
  log: DailyHealthLog,
  profile: HealthTrackerProfile,
): DailyHealthReport {
  const exerciseMinutes = log.exercises.reduce(
    (total, exercise) => total + exercise.durationMinutes,
    0,
  );
  const foodGroups = new Set(log.meals.map((meal) => meal.category)).size;
  const metrics: DailyReportMetric[] = [
    {
      key: "steps",
      label: "Steps",
      value: log.steps,
      goal: profile.stepGoal,
      displayValue: log.steps.toLocaleString("en-US"),
      displayGoal: `${profile.stepGoal.toLocaleString("en-US")} goal`,
      percentage: percentage(log.steps, profile.stepGoal),
    },
    {
      key: "water",
      label: "Water",
      value: log.waterMl,
      goal: profile.waterGoalMl,
      displayValue: `${log.waterMl.toLocaleString("en-US")} ml`,
      displayGoal: `${profile.waterGoalMl.toLocaleString("en-US")} ml goal`,
      percentage: percentage(log.waterMl, profile.waterGoalMl),
    },
    {
      key: "meals",
      label: "Meals",
      value: log.meals.length,
      goal: 4,
      displayValue: `${log.meals.length} logged`,
      displayGoal: `${foodGroups} food groups`,
      percentage: percentage(log.meals.length, 4),
    },
    {
      key: "exercise",
      label: "Exercise",
      value: exerciseMinutes,
      goal: 30,
      displayValue: `${exerciseMinutes} min`,
      displayGoal: "30 min daily marker",
      percentage: percentage(exerciseMinutes, 30),
    },
    {
      key: "routine",
      label: "Routine",
      value: log.completedRoutineItems.length,
      goal: 8,
      displayValue: `${log.completedRoutineItems.length}/8 habits`,
      displayGoal: "Daily checklist",
      percentage: percentage(log.completedRoutineItems.length, 8),
    },
  ];
  const trackedAreas = metrics.filter((metric) => metric.value > 0).length;
  const score = Math.round(
    metrics.reduce((total, metric) => total + metric.percentage, 0) / metrics.length,
  );

  let result: DailyHealthReport["result"];
  if (trackedAreas === 0) result = "No tracker data";
  else if (trackedAreas === 1) result = "Limited data";
  else if (score >= 80) result = "Strong consistency";
  else if (score >= 60) result = "Good progress";
  else if (score >= 40) result = "Building consistency";
  else result = "Needs consistency";

  const suggestions: string[] = [];
  if (trackedAreas < 3) {
    suggestions.push(
      "Record more tracker areas today so the daily result represents more than one habit.",
    );
  }
  if (metrics[0].percentage < 75) {
    suggestions.push(
      "If movement is safe for you, add a short comfortable walk or another activity that matches your ability.",
    );
  }
  if (metrics[1].percentage < 75) {
    suggestions.push(
      "Spread drinks through the day, but follow any fluid limit given by your clinician.",
    );
  }
  if (log.meals.length < 3 || foodGroups < 3) {
    suggestions.push(
      "Log regular meals and gradually include varied vegetables or fruit, protein, and whole grains where suitable.",
    );
  }
  if (exerciseMinutes < 15) {
    suggestions.push(
      "Consider a short workout from the exercise tracker and build duration gradually rather than doing too much at once.",
    );
  }
  if (log.completedRoutineItems.length < 4) {
    suggestions.push(
      "Choose one or two manageable routine habits to complete next; consistency matters more than a perfect score.",
    );
  }
  if (score >= 80 && trackedAreas >= 4) {
    suggestions.unshift(
      "Your logged habits were consistent today. Keep the routine realistic and allow time for recovery.",
    );
  }

  const summary =
    trackedAreas === 0
      ? "No health-tracker activity was saved for this date."
      : `${trackedAreas} of 5 tracker areas contain entries. The ${score}% score measures completion against your saved wellness goals.`;

  return {
    date: log.date,
    score,
    result,
    summary,
    trackedAreas,
    metrics,
    suggestions: suggestions.slice(0, 4),
    updatedAt: log.updatedAt,
  };
}
