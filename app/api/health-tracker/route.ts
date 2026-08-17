import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/store";
import type {
  DailyHealthLog,
  ExerciseIntensity,
  FoodCategory,
  HealthTrackerProfile,
  MealType,
  RoutineItemId,
  WorkoutTaskId,
} from "@/lib/types";

export const runtime = "nodejs";

const mealTypes = new Set<MealType>(["breakfast", "lunch", "dinner", "snack"]);
const foodCategories = new Set<FoodCategory>([
  "vegetables",
  "fruit",
  "protein",
  "grains",
  "dairy",
  "other",
]);
const exerciseIntensities = new Set<ExerciseIntensity>(["light", "moderate", "vigorous"]);
const workoutTasks: Record<
  WorkoutTaskId,
  { name: string; durationMinutes: number; intensity: ExerciseIntensity }
> = {
  walking: {
    name: "Beginner wake-up workout",
    durationMinutes: 10,
    intensity: "light",
  },
  "sit-to-stand": {
    name: "Chair sit-to-stand with calf raise",
    durationMinutes: 10,
    intensity: "light",
  },
  strength: {
    name: "Beginner strength workout",
    durationMinutes: 15,
    intensity: "moderate",
  },
  stretching: {
    name: "Gentle cool-down stretching",
    durationMinutes: 10,
    intensity: "light",
  },
  balance: {
    name: "Supported balance practice",
    durationMinutes: 10,
    intensity: "light",
  },
  "low-impact": {
    name: "Low-impact home cardio",
    durationMinutes: 10,
    intensity: "light",
  },
};
const routineItems = new Set<RoutineItemId>([
  "wake-on-time",
  "morning-light",
  "balanced-meals",
  "hydration",
  "movement",
  "screen-breaks",
  "wind-down",
  "bed-on-time",
]);
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateBefore(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function defaultProfile(userId: string): HealthTrackerProfile {
  return {
    userId,
    heightCm: null,
    weightKg: null,
    stepGoal: 8000,
    waterGoalMl: 2000,
    wakeupReminder: "07:00",
    breakfastReminder: "08:00",
    lunchReminder: "13:00",
    dinnerReminder: "20:00",
    exerciseReminder: "18:00",
    bedtimeReminder: "22:30",
    waterReminderMinutes: 120,
    updatedAt: "",
  };
}

function emptyLog(userId: string, date: string): DailyHealthLog {
  return {
    id: randomUUID(),
    userId,
    date,
    steps: 0,
    waterMl: 0,
    meals: [],
    exercises: [],
    completedRoutineItems: [],
    updatedAt: new Date().toISOString(),
  };
}

function numberInRange(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? number
    : null;
}

function error(message: string) {
  return Response.json({ ok: false, error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!validDate(date)) return error("A valid date is required.");

  const data = await readStore();
  const profile =
    data.healthTrackerProfiles.find((item) => item.userId === user.id) ??
    defaultProfile(user.id);
  const dates = Array.from({ length: 7 }, (_, index) => dateBefore(date, 6 - index));
  const week = dates.map(
    (day) =>
      data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === day,
      ) ?? {
        ...emptyLog(user.id, day),
        id: "",
        updatedAt: "",
      },
  );

  return Response.json({
    profile,
    today: week[week.length - 1],
    week,
    age: user.age,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const date = String(body.date ?? "");
  if (action !== "settings" && !validDate(date))
    return error("A valid date is required.");

  if (action === "settings") {
    const heightCm =
      body.heightCm === null || body.heightCm === ""
        ? null
        : numberInRange(body.heightCm, 40, 250);
    const weightKg =
      body.weightKg === null || body.weightKg === ""
        ? null
        : numberInRange(body.weightKg, 2, 400);
    const stepGoal = numberInRange(body.stepGoal, 500, 100000);
    const waterGoalMl = numberInRange(body.waterGoalMl, 250, 10000);
    const waterReminderMinutes = numberInRange(body.waterReminderMinutes, 30, 360);
    const reminders = [
      String(body.wakeupReminder ?? ""),
      String(body.breakfastReminder ?? ""),
      String(body.lunchReminder ?? ""),
      String(body.dinnerReminder ?? ""),
      String(body.exerciseReminder ?? ""),
      String(body.bedtimeReminder ?? ""),
    ];
    if (
      (body.heightCm !== null && body.heightCm !== "" && heightCm === null) ||
      (body.weightKg !== null && body.weightKg !== "" && weightKg === null) ||
      stepGoal === null ||
      waterGoalMl === null ||
      waterReminderMinutes === null ||
      reminders.some((time) => !timePattern.test(time))
    ) {
      return error("Check the tracker settings and reminder times.");
    }

    await updateStore((data) => {
      let profile = data.healthTrackerProfiles.find((item) => item.userId === user.id);
      if (!profile) {
        profile = defaultProfile(user.id);
        data.healthTrackerProfiles.push(profile);
      }
      Object.assign(profile, {
        heightCm,
        weightKg,
        stepGoal: Math.round(stepGoal),
        waterGoalMl: Math.round(waterGoalMl),
        wakeupReminder: reminders[0],
        breakfastReminder: reminders[1],
        lunchReminder: reminders[2],
        dinnerReminder: reminders[3],
        exerciseReminder: reminders[4],
        bedtimeReminder: reminders[5],
        waterReminderMinutes: Math.round(waterReminderMinutes),
        updatedAt: new Date().toISOString(),
      });
    });
    return Response.json({ ok: true });
  }

  if (action === "steps") {
    const steps = numberInRange(body.steps, 0, 200000);
    if (steps === null) return error("Steps must be between 0 and 200,000.");
    await updateStore((data) => {
      let log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (!log) {
        log = emptyLog(user.id, date);
        data.dailyHealthLogs.push(log);
      }
      log.steps = Math.round(steps);
      log.updatedAt = new Date().toISOString();
    });
    return Response.json({ ok: true });
  }

  if (action === "water") {
    const amountMl = numberInRange(body.amountMl, 50, 2000);
    if (amountMl === null) return error("Water amount must be 50–2,000 ml.");
    await updateStore((data) => {
      let log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (!log) {
        log = emptyLog(user.id, date);
        data.dailyHealthLogs.push(log);
      }
      log.waterMl = Math.min(20000, log.waterMl + Math.round(amountMl));
      log.updatedAt = new Date().toISOString();
    });
    return Response.json({ ok: true });
  }

  if (action === "meal") {
    const type = String(body.type ?? "") as MealType;
    const category = String(body.category ?? "") as FoodCategory;
    const name = String(body.name ?? "")
      .trim()
      .slice(0, 80);
    if (!mealTypes.has(type) || !foodCategories.has(category) || !name)
      return error("Enter a meal name, type, and food category.");
    await updateStore((data) => {
      let log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (!log) {
        log = emptyLog(user.id, date);
        data.dailyHealthLogs.push(log);
      }
      log.meals.push({
        id: randomUUID(),
        type,
        category,
        name,
        loggedAt: new Date().toISOString(),
      });
      log.updatedAt = new Date().toISOString();
    });
    return Response.json({ ok: true });
  }

  if (action === "delete-meal") {
    const mealId = String(body.mealId ?? "");
    await updateStore((data) => {
      const log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (log) {
        log.meals = log.meals.filter((meal) => meal.id !== mealId);
        log.updatedAt = new Date().toISOString();
      }
    });
    return Response.json({ ok: true });
  }

  if (action === "exercise") {
    const name = String(body.name ?? "")
      .trim()
      .slice(0, 80);
    const durationMinutes = numberInRange(body.durationMinutes, 1, 600);
    const intensity = String(body.intensity ?? "") as ExerciseIntensity;
    if (!name || durationMinutes === null || !exerciseIntensities.has(intensity))
      return error("Enter an exercise, duration, and intensity.");
    await updateStore((data) => {
      let log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (!log) {
        log = emptyLog(user.id, date);
        data.dailyHealthLogs.push(log);
      }
      log.exercises.push({
        id: randomUUID(),
        name,
        durationMinutes: Math.round(durationMinutes),
        intensity,
        workoutTaskId: null,
        loggedAt: new Date().toISOString(),
      });
      log.updatedAt = new Date().toISOString();
    });
    return Response.json({ ok: true });
  }

  if (action === "delete-exercise") {
    const exerciseId = String(body.exerciseId ?? "");
    await updateStore((data) => {
      const log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (log) {
        log.exercises = log.exercises.filter((exercise) => exercise.id !== exerciseId);
        log.updatedAt = new Date().toISOString();
      }
    });
    return Response.json({ ok: true });
  }

  if (action === "toggle-workout") {
    const workoutTaskId = String(body.workoutTaskId ?? "") as WorkoutTaskId;
    const workout = workoutTasks[workoutTaskId];
    if (!workout) return error("Choose a valid workout task.");
    await updateStore((data) => {
      let log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (!log) {
        log = emptyLog(user.id, date);
        data.dailyHealthLogs.push(log);
      }
      const completedExercise = log.exercises.find(
        (exercise) => exercise.workoutTaskId === workoutTaskId,
      );
      if (completedExercise) {
        log.exercises = log.exercises.filter(
          (exercise) => exercise.id !== completedExercise.id,
        );
      } else {
        log.exercises.push({
          id: randomUUID(),
          ...workout,
          workoutTaskId,
          loggedAt: new Date().toISOString(),
        });
      }
      log.updatedAt = new Date().toISOString();
    });
    return Response.json({ ok: true });
  }

  if (action === "toggle-routine") {
    const routineItem = String(body.routineItem ?? "") as RoutineItemId;
    if (!routineItems.has(routineItem)) return error("Choose a valid routine item.");
    await updateStore((data) => {
      let log = data.dailyHealthLogs.find(
        (item) => item.userId === user.id && item.date === date,
      );
      if (!log) {
        log = emptyLog(user.id, date);
        data.dailyHealthLogs.push(log);
      }
      log.completedRoutineItems = log.completedRoutineItems.includes(routineItem)
        ? log.completedRoutineItems.filter((item) => item !== routineItem)
        : [...log.completedRoutineItems, routineItem];
      log.updatedAt = new Date().toISOString();
    });
    return Response.json({ ok: true });
  }

  return error("Unknown tracker action.");
}
