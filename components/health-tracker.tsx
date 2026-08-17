"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DailyHealthLog,
  ExerciseIntensity,
  FoodCategory,
  HealthTrackerProfile,
  MealType,
  RoutineItemId,
  WorkoutTaskId,
} from "@/lib/types";

type TrackerSnapshot = {
  profile: HealthTrackerProfile;
  today: DailyHealthLog;
  week: DailyHealthLog[];
  age: number | null;
};

const categories: FoodCategory[] = [
  "vegetables",
  "fruit",
  "protein",
  "grains",
  "dairy",
  "other",
];
const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const exerciseNames = [
  "Walking",
  "Chair sit-to-stand",
  "Wall press-up",
  "Calf raises",
  "Balance practice",
  "Gentle stretching",
  "Yoga",
  "Cycling",
  "Swimming",
  "Other exercise",
];
const exerciseIntensities: ExerciseIntensity[] = ["light", "moderate", "vigorous"];
const routineItems: Array<{
  id: RoutineItemId;
  label: string;
  description: string;
}> = [
  {
    id: "wake-on-time",
    label: "Wake near your planned time",
    description: "Keep your wake time reasonably consistent, including weekends.",
  },
  {
    id: "morning-light",
    label: "Get morning daylight",
    description: "Spend a little time outdoors or near bright natural light.",
  },
  {
    id: "balanced-meals",
    label: "Eat regular, balanced meals",
    description: "Include a mix of vegetables or fruit, protein, and whole grains.",
  },
  {
    id: "hydration",
    label: "Follow your hydration plan",
    description: "Drink regularly unless a clinician has given you a fluid limit.",
  },
  {
    id: "movement",
    label: "Move during the day",
    description: "Use activity that is safe for your health and ability.",
  },
  {
    id: "screen-breaks",
    label: "Take screen and posture breaks",
    description: "Stand, stretch, rest your eyes, or change position regularly.",
  },
  {
    id: "wind-down",
    label: "Complete a calm wind-down",
    description: "Dim bright screens and choose a relaxing pre-sleep activity.",
  },
  {
    id: "bed-on-time",
    label: "Go to bed near your planned time",
    description: "Aim for a regular bedtime that allows enough sleep.",
  },
];
const reminderPreferenceKey = "health-tracker-reminders-enabled";

function localDateKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function percent(value: number, goal: number) {
  return Math.min(100, Math.round((value / Math.max(goal, 1)) * 100));
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sleepRecommendation(age: number | null) {
  if (age === null)
    return "Most adults generally need 7–9 hours; add your age for age-based context.";
  if (age <= 2)
    return "Ages 1–2 generally need 11–14 hours per 24 hours, including naps.";
  if (age <= 5)
    return "Ages 3–5 generally need 10–13 hours per 24 hours, including naps.";
  if (age <= 12) return "Ages 6–12 generally need 9–12 hours per 24 hours.";
  if (age <= 17) return "Ages 13–17 generally need 8–10 hours per 24 hours.";
  return "Adults generally need 7–9 hours of sleep each night.";
}

function plannedSleepHours(bedtime: string, wakeup: string) {
  const [bedHour, bedMinute] = bedtime.split(":").map(Number);
  const [wakeHour, wakeMinute] = wakeup.split(":").map(Number);
  let minutes = wakeHour * 60 + wakeMinute - (bedHour * 60 + bedMinute);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

export function HealthTracker() {
  const [date] = useState(localDateKey);
  const [data, setData] = useState<TrackerSnapshot | null>(null);
  const [stepsInput, setStepsInput] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading your tracker…");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [showExerciseSuggestions, setShowExerciseSuggestions] = useState(false);
  const [autoCounting, setAutoCounting] = useState(false);
  const [automaticBaseSteps, setAutomaticBaseSteps] = useState(0);
  const [automaticSteps, setAutomaticSteps] = useState(0);
  const [motionStatus, setMotionStatus] = useState(
    "Use a supported phone to estimate steps automatically.",
  );
  const automaticBaseRef = useRef(0);
  const automaticStepsRef = useRef(0);
  const automaticTotalRef = useRef(0);

  const load = useCallback(async () => {
    const response = await fetch(`/api/health-tracker?date=${date}`, {
      cache: "no-store",
    });
    const result = (await response.json()) as TrackerSnapshot & { error?: string };
    if (!response.ok) throw new Error(result.error || "Could not load health tracker.");
    setData(result);
    setStepsInput(String(result.today.steps));
    setMessage("");
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((error) =>
        setMessage(error instanceof Error ? error.message : "Could not load tracker."),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        window.localStorage.getItem(reminderPreferenceKey) !== "0"
      ) {
        setRemindersEnabled(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!remindersEnabled || !data || typeof Notification === "undefined") return;
    const profile = data.profile;

    function sendOnce(key: string, title: string, body: string) {
      const storageKey = `health-tracker-reminder:${date}:${key}`;
      if (window.localStorage.getItem(storageKey)) return;
      try {
        new Notification(title, { body, icon: "/images/blood-drop-logo.svg" });
        window.localStorage.setItem(storageKey, "1");
      } catch {
        setMessage("This browser cannot display tracker notifications.");
      }
    }

    function checkReminders() {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const reminders = [
        {
          scheduledTime: profile.wakeupReminder,
          key: "wakeup",
          title: "Wake-up reminder",
          body: "Good morning. Start your planned healthy routine when you are ready.",
        },
        {
          scheduledTime: profile.breakfastReminder,
          key: "breakfast",
          title: "Breakfast reminder",
          body: "Take time for your planned meal.",
        },
        {
          scheduledTime: profile.lunchReminder,
          key: "lunch",
          title: "Lunch reminder",
          body: "Take time for your planned meal.",
        },
        {
          scheduledTime: profile.dinnerReminder,
          key: "dinner",
          title: "Dinner reminder",
          body: "Take time for your planned meal.",
        },
        {
          scheduledTime: profile.exerciseReminder,
          key: "exercise",
          title: "Exercise reminder",
          body: "If it is safe today, complete your planned movement session.",
        },
        {
          scheduledTime: profile.bedtimeReminder,
          key: "bedtime",
          title: "Bedtime reminder",
          body: "Begin your wind-down and prepare for your planned sleep time.",
        },
      ];
      for (const { scheduledTime, key, title, body } of reminders) {
        if (time === scheduledTime) sendOnce(`scheduled:${key}`, title, body);
      }

      const minutes = now.getHours() * 60 + now.getMinutes();
      if (minutes > 0 && minutes % profile.waterReminderMinutes === 0) {
        sendOnce(
          `water:${time}`,
          "Water reminder",
          "Consider a drink if it fits your personal fluid plan.",
        );
      }
    }

    checkReminders();
    const timer = window.setInterval(checkReminders, 30_000);
    return () => window.clearInterval(timer);
  }, [data, date, remindersEnabled]);

  useEffect(() => {
    if (!autoCounting) return;

    let gravity = { x: 0, y: 0, z: 0 };
    let initialized = false;
    let readyForStep = true;
    let lastStepAt = 0;
    let samples = 0;

    function saveEstimate() {
      if (!automaticStepsRef.current) return;
      void fetch("/api/health-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "steps",
          date,
          steps: automaticTotalRef.current,
        }),
        keepalive: true,
      }).catch(() => undefined);
    }

    function handleMotion(event: DeviceMotionEvent) {
      const acceleration = event.accelerationIncludingGravity;
      const x = acceleration?.x;
      const y = acceleration?.y;
      const z = acceleration?.z;
      if (
        x === null ||
        x === undefined ||
        y === null ||
        y === undefined ||
        z === null ||
        z === undefined
      )
        return;
      samples += 1;

      if (!initialized) {
        gravity = { x, y, z };
        initialized = true;
        return;
      }

      const smoothing = 0.82;
      gravity.x = smoothing * gravity.x + (1 - smoothing) * x;
      gravity.y = smoothing * gravity.y + (1 - smoothing) * y;
      gravity.z = smoothing * gravity.z + (1 - smoothing) * z;
      const linearMagnitude = Math.sqrt(
        (x - gravity.x) ** 2 + (y - gravity.y) ** 2 + (z - gravity.z) ** 2,
      );
      const now = performance.now();

      if (linearMagnitude < 0.65) readyForStep = true;
      if (readyForStep && linearMagnitude > 1.25 && now - lastStepAt > 280) {
        readyForStep = false;
        lastStepAt = now;
        automaticStepsRef.current += 1;
        automaticTotalRef.current = automaticBaseRef.current + automaticStepsRef.current;
        setAutomaticSteps(automaticStepsRef.current);
        setStepsInput(String(automaticTotalRef.current));
      }
    }

    window.addEventListener("devicemotion", handleMotion);
    const unavailableTimer = window.setTimeout(() => {
      if (samples === 0) {
        setMotionStatus(
          "No motion data was received. Check browser sensor permission or use manual entry.",
        );
        setAutoCounting(false);
      }
    }, 4000);
    const saveTimer = window.setInterval(saveEstimate, 15_000);
    window.addEventListener("pagehide", saveEstimate);

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      window.removeEventListener("pagehide", saveEstimate);
      window.clearTimeout(unavailableTimer);
      window.clearInterval(saveTimer);
      saveEstimate();
    };
  }, [autoCounting, date]);

  async function mutate(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/health-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update tracker.");
      await load();
      setMessage(successMessage);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update tracker.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function enableReminders() {
    if (!("Notification" in window)) {
      setMessage("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setRemindersEnabled(enabled);
    window.localStorage.setItem(reminderPreferenceKey, enabled ? "1" : "0");
    setMessage(
      enabled
        ? "Reminders enabled while this tracker is open."
        : "Notification permission was not granted.",
    );
  }

  function disableReminders() {
    setRemindersEnabled(false);
    window.localStorage.setItem(reminderPreferenceKey, "0");
    setMessage(
      "Wake-up, bedtime, meal, water, and exercise reminders are disabled. You can enable them again at any time.",
    );
  }

  async function startAutomaticCounting() {
    if (!("DeviceMotionEvent" in window)) {
      setMotionStatus("This device or browser does not provide motion data.");
      return;
    }
    if (!window.isSecureContext) {
      setMotionStatus("Automatic counting requires HTTPS or localhost.");
      return;
    }

    type MotionPermissionConstructor = typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const motionEvent = DeviceMotionEvent as MotionPermissionConstructor;
    try {
      if (motionEvent.requestPermission) {
        const permission = await motionEvent.requestPermission();
        if (permission !== "granted") {
          setMotionStatus("Motion-sensor permission was not granted.");
          return;
        }
      }
      automaticBaseRef.current = data?.today.steps ?? (Number(stepsInput) || 0);
      automaticStepsRef.current = 0;
      automaticTotalRef.current = automaticBaseRef.current;
      setAutomaticBaseSteps(automaticBaseRef.current);
      setAutomaticSteps(0);
      setAutoCounting(true);
      setMotionStatus(
        "Counting motion-based step estimates… carry your phone as you walk.",
      );
    } catch {
      setMotionStatus("Motion permission is unavailable. Use manual step entry instead.");
    }
  }

  async function stopAutomaticCounting() {
    const total = automaticTotalRef.current;
    setAutoCounting(false);
    await mutate(
      { action: "steps", date, steps: total },
      `Automatic count saved: ${automaticStepsRef.current} estimated steps added.`,
    );
    setMotionStatus("Automatic counting stopped. You can start another walking session.");
  }

  if (!data) {
    return <div className="notice notice-info">{message}</div>;
  }

  const displayedSteps = autoCounting
    ? automaticBaseSteps + automaticSteps
    : data.today.steps;
  const stepProgress = percent(displayedSteps, data.profile.stepGoal);
  const waterProgress = percent(data.today.waterMl, data.profile.waterGoalMl);
  const exerciseMinutes = data.today.exercises.reduce(
    (total, exercise) => total + exercise.durationMinutes,
    0,
  );
  const bmi =
    data.age !== null && data.age >= 20 && data.profile.heightCm && data.profile.weightKg
      ? data.profile.weightKg / (data.profile.heightCm / 100) ** 2
      : null;
  const dailyWorkoutTasks = exerciseSuggestions(data.age, bmi);
  const completedWorkoutCount = dailyWorkoutTasks.filter((task) =>
    data.today.exercises.some((exercise) => exercise.workoutTaskId === task.id),
  ).length;
  const completedRoutineCount = data.today.completedRoutineItems.length;
  const scheduledSleepHours = plannedSleepHours(
    data.profile.bedtimeReminder,
    data.profile.wakeupReminder,
  );
  const savedHeightInches = data.profile.heightCm ? data.profile.heightCm / 2.54 : null;
  const savedHeightTenths =
    savedHeightInches === null ? null : Math.round(savedHeightInches * 10);
  const savedHeightFeet =
    savedHeightTenths === null ? null : Math.floor(savedHeightTenths / 120);
  const savedRemainingInches =
    savedHeightTenths === null || savedHeightFeet === null
      ? null
      : (savedHeightTenths - savedHeightFeet * 120) / 10;

  return (
    <div className="tracker-stack">
      {message && (
        <div className="notice notice-info" role="status">
          {message}
        </div>
      )}

      <section className="tracker-summary" aria-label="Today’s progress">
        <ProgressCard
          label="Steps"
          value={displayedSteps.toLocaleString()}
          goal={`${data.profile.stepGoal.toLocaleString()} goal`}
          progress={stepProgress}
        />
        <ProgressCard
          label="Water"
          value={`${data.today.waterMl.toLocaleString()} ml`}
          goal={`${data.profile.waterGoalMl.toLocaleString()} ml goal`}
          progress={waterProgress}
        />
        <ProgressCard
          label="Meals logged"
          value={String(data.today.meals.length)}
          goal="Build a varied day"
          progress={Math.min(100, data.today.meals.length * 25)}
        />
        <ProgressCard
          label="Exercise"
          value={`${exerciseMinutes} min`}
          goal="Today’s recorded activity"
          progress={Math.min(100, Math.round((exerciseMinutes / 30) * 100))}
        />
        <ProgressCard
          label="Daily routine"
          value={`${completedRoutineCount}/${routineItems.length}`}
          goal="Healthy habits completed"
          progress={percent(completedRoutineCount, routineItems.length)}
        />
        <div className="tracker-metric">
          <span>Body context</span>
          <strong>{bmi ? `BMI ${bmi.toFixed(1)}` : "Add measurements"}</strong>
          <small>
            {bmi
              ? "Adult screening value—not a diagnosis"
              : "Height and weight are optional"}
          </small>
        </div>
      </section>

      <section className="card">
        <div className="section-actions">
          <div>
            <p className="eyebrow">Daily healthy routine</p>
            <h2>Build consistent habits</h2>
          </div>
          <strong className="routine-score">
            {completedRoutineCount} of {routineItems.length} today
          </strong>
        </div>
        <div className="sleep-plan" aria-label="Planned sleep schedule">
          <div>
            <span>Wake-up</span>
            <strong>{data.profile.wakeupReminder}</strong>
          </div>
          <div>
            <span>Bedtime</span>
            <strong>{data.profile.bedtimeReminder}</strong>
          </div>
          <div>
            <span>Planned sleep window</span>
            <strong>{scheduledSleepHours.toFixed(1)} hours</strong>
          </div>
          <p>{sleepRecommendation(data.age)}</p>
        </div>
        <div className="routine-grid">
          {routineItems.map((item) => {
            const completed = data.today.completedRoutineItems.includes(item.id);
            return (
              <button
                className={`routine-item${completed ? " routine-item-complete" : ""}`}
                type="button"
                aria-pressed={completed}
                disabled={busy}
                key={item.id}
                onClick={() =>
                  void mutate(
                    { action: "toggle-routine", date, routineItem: item.id },
                    completed
                      ? `${item.label} marked incomplete.`
                      : `${item.label} completed.`,
                  )
                }
              >
                <span className="routine-check" aria-hidden="true">
                  {completed ? "✓" : ""}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </div>
        <p className="field-help">
          Use this as a flexible checklist, not a strict medical plan. Shift the times
          around work, caregiving, school, medication instructions, and your clinician’s
          advice.
        </p>
      </section>

      {bmi !== null && (bmi < 18.5 || bmi >= 25) && (
        <BmiGuidance bmi={bmi} age={data.age ?? 20} />
      )}

      <section className="card">
        <p className="eyebrow">Daily activity</p>
        <h2>Record steps and water</h2>
        <div className="tracker-log-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void mutate(
                { action: "steps", date, steps: Number(stepsInput) },
                "Steps saved.",
              );
            }}
          >
            <div className="field">
              <label htmlFor="steps">Today’s step count</label>
              <input
                id="steps"
                type="number"
                min="0"
                max="200000"
                value={stepsInput}
                onChange={(event) => setStepsInput(event.target.value)}
                disabled={autoCounting}
                required
              />
              <p className="field-help">
                Enter steps from your phone, watch, or pedometer.
              </p>
            </div>
            <div className="tracker-quick-actions">
              <button
                className="button button-small"
                type="submit"
                disabled={busy || autoCounting}
              >
                Save manually
              </button>
              {autoCounting ? (
                <button
                  className="button button-danger button-small"
                  type="button"
                  disabled={busy}
                  onClick={() => void stopAutomaticCounting()}
                >
                  Stop & save ({automaticSteps})
                </button>
              ) : (
                <button
                  className="button button-secondary button-small"
                  type="button"
                  disabled={busy}
                  onClick={() => void startAutomaticCounting()}
                >
                  Start automatic count
                </button>
              )}
            </div>
            <p className="tracker-motion-status" role="status">
              {motionStatus}
            </p>
            <p className="field-help">
              Analysis: {stepAnalysis(stepProgress, autoCounting)}
            </p>
          </form>
          <div>
            <strong>Quick water log</strong>
            <p className="muted small">Add drinks to today’s total.</p>
            <div className="tracker-quick-actions">
              {[250, 500, 750].map((amount) => (
                <button
                  className="button button-secondary button-small"
                  type="button"
                  disabled={busy}
                  key={amount}
                  onClick={() =>
                    void mutate(
                      { action: "water", date, amountMl: amount },
                      `${amount} ml added.`,
                    )
                  }
                >
                  + {amount} ml
                </button>
              ))}
            </div>
            <p className="field-help">
              Fluid needs vary. Follow a clinician’s limit if you have one.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-actions">
          <div>
            <p className="eyebrow">Exercise tracker</p>
            <h2>Record daily exercise</h2>
          </div>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => setShowExerciseSuggestions(true)}
          >
            Video workouts ({completedWorkoutCount}/{dailyWorkoutTasks.length})
          </button>
        </div>
        <form
          className="tracker-exercise-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            void mutate(
              {
                action: "exercise",
                date,
                name: values.get("exerciseName"),
                durationMinutes: values.get("exerciseDuration"),
                intensity: values.get("exerciseIntensity"),
              },
              "Exercise recorded.",
            ).then((saved) => saved && form.reset());
          }}
        >
          <div className="field">
            <label htmlFor="exerciseName">Exercise</label>
            <select id="exerciseName" name="exerciseName" defaultValue="Walking">
              {exerciseNames.map((name) => (
                <option value={name} key={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="exerciseDuration">Duration (minutes)</label>
            <input
              id="exerciseDuration"
              name="exerciseDuration"
              type="number"
              min="1"
              max="600"
              defaultValue="10"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="exerciseIntensity">Intensity</label>
            <select id="exerciseIntensity" name="exerciseIntensity" defaultValue="light">
              {exerciseIntensities.map((intensity) => (
                <option value={intensity} key={intensity}>
                  {titleCase(intensity)}
                </option>
              ))}
            </select>
          </div>
          <button className="button button-small" type="submit" disabled={busy}>
            Record exercise
          </button>
        </form>

        {data.today.exercises.length ? (
          <ul className="tracker-exercise-list">
            {data.today.exercises.map((exercise) => (
              <li key={exercise.id}>
                <span>
                  <strong>{exercise.name}</strong>
                  <small>
                    {exercise.durationMinutes} minutes · {titleCase(exercise.intensity)}
                  </small>
                </span>
                <button
                  className="button-text"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      {
                        action: "delete-exercise",
                        date,
                        exerciseId: exercise.id,
                      },
                      "Exercise removed.",
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">No exercise recorded today.</p>
        )}
      </section>

      <section className="card">
        <p className="eyebrow">Diet log</p>
        <h2>Track meals and food variety</h2>
        <form
          className="tracker-meal-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            void mutate(
              {
                action: "meal",
                date,
                name: values.get("mealName"),
                type: values.get("mealType"),
                category: values.get("foodCategory"),
              },
              "Meal added.",
            ).then((saved) => saved && form.reset());
          }}
        >
          <div className="field">
            <label htmlFor="mealName">Food or meal</label>
            <input id="mealName" name="mealName" maxLength={80} required />
          </div>
          <div className="field">
            <label htmlFor="mealType">Meal</label>
            <select id="mealType" name="mealType" defaultValue="breakfast">
              {mealTypes.map((type) => (
                <option value={type} key={type}>
                  {titleCase(type)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="foodCategory">Main food group</label>
            <select id="foodCategory" name="foodCategory" defaultValue="vegetables">
              {categories.map((category) => (
                <option value={category} key={category}>
                  {titleCase(category)}
                </option>
              ))}
            </select>
          </div>
          <button className="button button-small" type="submit" disabled={busy}>
            Add meal
          </button>
        </form>
        <div className="diet-layout">
          <DietChart logs={data.today.meals.map((meal) => meal.category)} />
          <div>
            <h3>Today’s meal log</h3>
            {data.today.meals.length ? (
              <ul className="tracker-meal-list">
                {data.today.meals.map((meal) => (
                  <li key={meal.id}>
                    <span>
                      <strong>{meal.name}</strong>
                      <small>
                        {titleCase(meal.type)} · {titleCase(meal.category)}
                      </small>
                    </span>
                    <button
                      className="button-text"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          { action: "delete-meal", date, mealId: meal.id },
                          "Meal removed.",
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No meals logged today.</p>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Seven-day charts</p>
        <h2>Your recent consistency</h2>
        <div className="tracker-chart-grid">
          <WeeklyChart
            title="Steps"
            logs={data.week}
            goal={data.profile.stepGoal}
            value={(log) => log.steps}
          />
          <WeeklyChart
            title="Water (ml)"
            logs={data.week}
            goal={data.profile.waterGoalMl}
            value={(log) => log.waterMl}
          />
          <WeeklyChart
            title="Exercise (minutes)"
            logs={data.week}
            goal={30}
            value={(log) =>
              log.exercises.reduce(
                (total, exercise) => total + exercise.durationMinutes,
                0,
              )
            }
          />
          <WeeklyChart
            title="Routine habits"
            logs={data.week}
            goal={routineItems.length}
            value={(log) => log.completedRoutineItems.length}
          />
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Personal settings</p>
        <h2>Measurements, goals, and reminders</h2>
        <p className="muted small">{activityGuidance(data.age)}</p>
        {data.age === null && (
          <p className="small">
            <Link href="/profile">Add your age in Profile</Link> for age-based activity
            context.
          </p>
        )}
        <form
          className="form-grid tracker-settings"
          key={data.profile.updatedAt || "default-settings"}
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const feet = String(values.get("heightFeet") ?? "").trim();
            const inches = String(values.get("heightInches") ?? "").trim();
            const heightCm =
              !feet && !inches
                ? null
                : Math.round((Number(feet) * 12 + Number(inches)) * 2.54 * 10) / 10;
            void mutate(
              {
                action: "settings",
                heightCm,
                weightKg: values.get("weightKg"),
                stepGoal: values.get("stepGoal"),
                waterGoalMl: values.get("waterGoalMl"),
                wakeupReminder: values.get("wakeupReminder"),
                breakfastReminder: values.get("breakfastReminder"),
                lunchReminder: values.get("lunchReminder"),
                dinnerReminder: values.get("dinnerReminder"),
                exerciseReminder: values.get("exerciseReminder"),
                bedtimeReminder: values.get("bedtimeReminder"),
                waterReminderMinutes: values.get("waterReminderMinutes"),
              },
              "Tracker settings saved.",
            );
          }}
        >
          <NumberField
            id="heightFeet"
            label="Height (feet)"
            min={1}
            max={8}
            value={savedHeightFeet}
          />
          <NumberField
            id="heightInches"
            label="Additional inches"
            min={0}
            max={11.9}
            step="0.1"
            value={savedRemainingInches}
          />
          <NumberField
            id="weightKg"
            label="Weight (kg)"
            min={2}
            max={400}
            step="0.1"
            value={data.profile.weightKg}
          />
          <NumberField
            id="stepGoal"
            label="Daily step goal"
            min={500}
            max={100000}
            value={data.profile.stepGoal}
            required
          />
          <NumberField
            id="waterGoalMl"
            label="Daily water goal (ml)"
            min={250}
            max={10000}
            value={data.profile.waterGoalMl}
            required
          />
          <TimeField
            id="wakeupReminder"
            label="Wake-up alarm"
            value={data.profile.wakeupReminder}
          />
          <TimeField
            id="breakfastReminder"
            label="Breakfast reminder"
            value={data.profile.breakfastReminder}
          />
          <TimeField
            id="lunchReminder"
            label="Lunch reminder"
            value={data.profile.lunchReminder}
          />
          <TimeField
            id="dinnerReminder"
            label="Dinner reminder"
            value={data.profile.dinnerReminder}
          />
          <TimeField
            id="exerciseReminder"
            label="Exercise reminder"
            value={data.profile.exerciseReminder}
          />
          <TimeField
            id="bedtimeReminder"
            label="Bedtime alarm"
            value={data.profile.bedtimeReminder}
          />
          <NumberField
            id="waterReminderMinutes"
            label="Water reminder interval (minutes)"
            min={30}
            max={360}
            step="30"
            value={data.profile.waterReminderMinutes}
            required
          />
          <div className="field field-wide tracker-settings-actions">
            <button className="button" type="submit" disabled={busy}>
              Save settings
            </button>
            <button
              className={`button ${remindersEnabled ? "button-danger" : "button-secondary"}`}
              type="button"
              onClick={remindersEnabled ? disableReminders : () => void enableReminders()}
              disabled={busy}
              aria-pressed={remindersEnabled}
            >
              {remindersEnabled ? "Disable reminders" : "Enable browser reminders"}
            </button>
          </div>
        </form>
        <div className="disclaimer">
          Browser wake-up, bedtime, meal, water, and exercise reminders require
          notification permission and this tracker to remain open; they are not guaranteed
          alarms. Height, weight, BMI, sleep planning, steps, meals, and water are
          wellness records—not diagnoses. Ask a clinician before changing activity or
          fluid intake if you are pregnant, unwell, or have heart, kidney, mobility,
          sleep, or eating-related concerns.
        </div>
      </section>
      {showExerciseSuggestions && (
        <ExerciseSuggestionsDialog
          age={data.age}
          bmi={bmi}
          busy={busy}
          completedTaskIds={data.today.exercises.flatMap((exercise) =>
            exercise.workoutTaskId ? [exercise.workoutTaskId] : [],
          )}
          onToggleTask={(workoutTaskId, completed) =>
            mutate(
              { action: "toggle-workout", date, workoutTaskId },
              completed
                ? "Workout task marked incomplete."
                : "Workout completed and added to today’s exercise record.",
            )
          }
          onClose={() => setShowExerciseSuggestions(false)}
        />
      )}
    </div>
  );
}

interface ExerciseSuggestion {
  id: WorkoutTaskId;
  name: string;
  purpose: string;
  startingPoint: string;
  durationMinutes: number;
  videoUrl: string;
  videoLabel: string;
  videoId: string | null;
}

function ExerciseSuggestionsDialog({
  age,
  bmi,
  busy,
  completedTaskIds,
  onToggleTask,
  onClose,
}: {
  age: number | null;
  bmi: number | null;
  busy: boolean;
  completedTaskIds: WorkoutTaskId[];
  onToggleTask: (taskId: WorkoutTaskId, completed: boolean) => Promise<boolean>;
  onClose: () => void;
}) {
  const suggestions = exerciseSuggestions(age, bmi);
  const plan = bmiExercisePlan(age, bmi);
  const [activeVideoExercise, setActiveVideoExercise] =
    useState<ExerciseSuggestion | null>(null);
  const completedCount = suggestions.filter((exercise) =>
    completedTaskIds.includes(exercise.id),
  ).length;
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-panel exercise-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-dialog-title"
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Daily video workout</p>
            <h2 id="exercise-dialog-title">Watch, exercise, and complete each task</h2>
            <p className="muted small">
              Suggestions use your saved age and adult BMI context. Start below your
              maximum ability and build gradually.
            </p>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Close exercise suggestions"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="workout-task-progress" aria-label="Daily workout progress">
          <div>
            <strong>
              {completedCount} of {suggestions.length} workout tasks complete
            </strong>
            <span>{Math.round((completedCount / suggestions.length) * 100)}%</span>
          </div>
          <div className="tracker-progress">
            <span style={{ width: `${(completedCount / suggestions.length) * 100}%` }} />
          </div>
        </div>

        {activeVideoExercise?.videoId && (
          <section
            className="workout-video-player"
            id="workout-video-player"
            aria-labelledby="active-workout-title"
          >
            <div className="workout-video-heading">
              <div>
                <span className="place-category">Exercise video playing</span>
                <h3 id="active-workout-title">{activeVideoExercise.name}</h3>
                <p>
                  Follow only the movements that feel safe and stop whenever you need to
                  rest. Suggested task: {activeVideoExercise.durationMinutes} minutes.
                </p>
              </div>
              <button
                className="button-text"
                type="button"
                onClick={() => setActiveVideoExercise(null)}
              >
                Close video
              </button>
            </div>
            <div className="workout-video-frame">
              <iframe
                key={activeVideoExercise.videoId}
                src={`https://www.youtube-nocookie.com/embed/${activeVideoExercise.videoId}?autoplay=1&rel=0`}
                title={`${activeVideoExercise.name} exercise video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="workout-video-footer">
              <p>
                The video does not mark itself complete automatically. Select the button
                after you finish the part you planned to do.
              </p>
              <button
                className={`button button-small${completedTaskIds.includes(activeVideoExercise.id) ? " button-danger" : ""}`}
                type="button"
                disabled={busy}
                aria-pressed={completedTaskIds.includes(activeVideoExercise.id)}
                onClick={() =>
                  void onToggleTask(
                    activeVideoExercise.id,
                    completedTaskIds.includes(activeVideoExercise.id),
                  )
                }
              >
                {completedTaskIds.includes(activeVideoExercise.id)
                  ? "Undo completion"
                  : "Complete this workout"}
              </button>
            </div>
          </section>
        )}

        <div className="bmi-exercise-plan">
          <div className="bmi-exercise-plan-heading">
            <div>
              <span className="place-category">Your starting plan</span>
              <h3>{plan.label}</h3>
              <p>{plan.summary}</p>
            </div>
            {bmi !== null && <strong>BMI {bmi.toFixed(1)}</strong>}
          </div>
          <div className="bmi-exercise-plan-grid">
            <div>
              <strong>Aerobic movement</strong>
              <p>{plan.aerobic}</p>
            </div>
            <div>
              <strong>Strength</strong>
              <p>{plan.strength}</p>
            </div>
            <div>
              <strong>Mobility and recovery</strong>
              <p>{plan.mobility}</p>
            </div>
          </div>
        </div>

        <div className="exercise-suggestion-grid">
          {suggestions.map((exercise) => {
            const completed = completedTaskIds.includes(exercise.id);
            return (
              <article
                className={`exercise-suggestion${completed ? " exercise-suggestion-complete" : ""}`}
                key={exercise.id}
              >
                <span className="place-category">
                  {completed ? "Completed today" : "Daily workout task"}
                </span>
                <h3>{exercise.name}</h3>
                <p>{exercise.purpose}</p>
                <strong>Begin with</strong>
                <p>{exercise.startingPoint}</p>
                <p className="workout-duration">
                  Suggested task: {exercise.durationMinutes} minutes
                </p>
                <div className="workout-task-actions">
                  {exercise.videoId ? (
                    <button
                      className="button button-secondary button-small"
                      type="button"
                      onClick={() => {
                        setActiveVideoExercise(exercise);
                        window.requestAnimationFrame(() =>
                          document
                            .getElementById("workout-video-player")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                        );
                      }}
                    >
                      Start video exercise
                    </button>
                  ) : (
                    <a
                      className="button button-secondary button-small"
                      href={exercise.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {exercise.videoLabel} ↗
                    </a>
                  )}
                  <button
                    className={`button button-small${completed ? " button-danger" : ""}`}
                    type="button"
                    disabled={busy}
                    aria-pressed={completed}
                    onClick={() => void onToggleTask(exercise.id, completed)}
                  >
                    {completed ? "Undo completion" : "Mark workout complete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="disclaimer">
          These are general exercise ideas, not physiotherapy or treatment. Use a clear,
          stable space and supportive footwear where appropriate. Stop immediately for
          chest pain, faintness, severe breathlessness, or new pain. Ask a clinician or
          physiotherapist first if you are pregnant, recovering from surgery, have had a
          recent medical event, or have significant heart, lung, joint, balance, or
          neurological concerns.
        </div>
      </section>
    </div>
  );
}

function bmiExercisePlan(age: number | null, bmi: number | null) {
  if (age === null || age < 20) {
    return {
      label: "Age-appropriate activity plan",
      summary:
        "Adult BMI categories are not being applied. Choose activity appropriate for age, development, ability, and professional advice.",
      aerobic:
        age !== null && age >= 5
          ? "Use varied active movement each day."
          : "Use active play appropriate for development.",
      strength: "Use supervised, age-appropriate body-weight and play activities.",
      mobility: "Include comfortable movement variety and adequate recovery.",
    };
  }
  if (bmi === null) {
    return {
      label: "General adult starting plan",
      summary: "Add height and weight to receive adult BMI-based starting context.",
      aerobic: "Start with comfortable walking and build duration gradually.",
      strength: "Include beginner strength work on two non-consecutive days.",
      mobility: "Warm up, cool down, and include pain-free mobility work.",
    };
  }
  if (bmi < 18.5) {
    return {
      label: "Strength-focused plan for a below-range BMI",
      summary:
        "Prioritize strength, recovery, and adequate nutrition. Avoid using large amounts of cardio solely to change weight.",
      aerobic:
        "Use comfortable walking or cycling for 10–20 minutes and increase only when energy and recovery are good.",
      strength:
        "Start two weekly full-body sessions using sit-to-stands, wall press-ups, and light resistance.",
      mobility:
        "Add gentle stretching and rest days; seek review for weakness or unplanned weight loss.",
    };
  }
  if (bmi < 25) {
    return {
      label: "Balanced plan for an in-range BMI",
      summary:
        "Combine aerobic, strength, and mobility work to support general health rather than focusing only on weight.",
      aerobic:
        "Build toward regular moderate activity across the week, using walking, cycling, swimming, or another activity you enjoy.",
      strength:
        "Train major muscle groups on at least two days each week, starting with controlled body-weight movements.",
      mobility: "Warm up before activity and use gentle cool-down stretches afterward.",
    };
  }
  if (bmi < 30) {
    return {
      label: "Gradual plan for an above-range BMI",
      summary:
        "Use sustainable, joint-comfortable activity and progress gradually instead of beginning with high-impact or exhaustive sessions.",
      aerobic:
        "Start with 10–15 minutes of walking, cycling, or swimming and add a few minutes as comfort improves.",
      strength:
        "Use sit-to-stands, wall press-ups, and light resistance twice weekly to support muscles and joints.",
      mobility:
        "Include comfortable stretching and recovery; reduce impact if joints become painful.",
    };
  }
  return {
    label: "Low-impact starting plan for a BMI of 30 or higher",
    summary:
      "Begin with manageable, joint-friendly sessions. A clinician or physiotherapist can help adapt activity for symptoms and medical conditions.",
    aerobic:
      "Try 5–10 minutes of comfortable walking, stationary cycling, chair cardio, or swimming, then increase gradually.",
    strength:
      "Start with supported sit-to-stands and wall press-ups on two days, allowing recovery between sessions.",
    mobility:
      "Use supported balance and gentle range-of-motion work; stop for new joint pain, faintness, or severe breathlessness.",
  };
}

function exerciseSuggestions(
  age: number | null,
  bmi: number | null,
): ExerciseSuggestion[] {
  const walking: ExerciseSuggestion = {
    id: "walking",
    name: "Beginner wake-up workout",
    purpose: "Use a guided combination of cardio and strength movements.",
    startingPoint:
      "Follow the easiest movements for up to 10 minutes, pausing whenever needed.",
    durationMinutes: 10,
    videoUrl: "https://www.nhs.uk/live-well/exercise/aerobic-exercises/wake-up-workout/",
    videoLabel: "Start NHS workout video",
    videoId: "KF6Z1udGnf4",
  };
  const sitToStand: ExerciseSuggestion = {
    id: "sit-to-stand",
    name: "Chair sit-to-stand with calf raise",
    purpose: "Work the legs and practice a movement used in daily life.",
    startingPoint:
      "Use a stable chair and begin with a small number of controlled repetitions.",
    durationMinutes: 10,
    videoUrl:
      "https://www.nhs.uk/live-well/exercise/strength-and-flex-exercise-plan-how-to-videos/",
    videoLabel: "Watch NHS demonstration",
    videoId: null,
  };
  const strength: ExerciseSuggestion = {
    id: "strength",
    name: "Beginner strength workout",
    purpose: "Train major muscle groups and support everyday function.",
    startingPoint: "Use light resistance and leave rest between comfortable sets.",
    durationMinutes: 15,
    videoUrl: "https://www.nhs.uk/better-health/get-active/home-workout-videos/",
    videoLabel: "Watch NHS workout video",
    videoId: null,
  };
  const stretching: ExerciseSuggestion = {
    id: "stretching",
    name: "Gentle cool-down stretching",
    purpose: "Slow down after activity and move major muscle groups comfortably.",
    startingPoint: "Use slow, pain-free holds without bouncing or forcing range.",
    durationMinutes: 10,
    videoUrl:
      "https://www.nhs.uk/live-well/exercise/strength-and-resistance/body-blast-cool-down/",
    videoLabel: "Start NHS cool-down video",
    videoId: "Z_d4rVxZTmY",
  };
  const balance: ExerciseSuggestion = {
    id: "balance",
    name: "Supported balance practice",
    purpose: "Practice control and stability near a wall or stable chair.",
    startingPoint: "Begin with sideways walking or a supported one-leg stand.",
    durationMinutes: 10,
    videoUrl: "https://www.nhs.uk/live-well/exercise/balance-exercises/",
    videoLabel: "View NHS demonstrations",
    videoId: null,
  };
  const lowImpact: ExerciseSuggestion = {
    id: "low-impact",
    name: "Low-impact home cardio",
    purpose:
      "Build aerobic activity with movements that can be adapted to reduce impact.",
    startingPoint:
      "Choose the easiest variation, try 5–10 minutes, and pause whenever needed.",
    durationMinutes: 10,
    videoUrl:
      "https://www.nhs.uk/live-well/exercise/aerobic-exercises/aerobics-for-beginners/",
    videoLabel: "Start NHS workout video",
    videoId: null,
  };

  if (age !== null && age < 18) {
    return [walking, stretching, strength].map((exercise) => ({
      ...exercise,
      startingPoint: `${exercise.startingPoint} A parent or guardian should help choose age-appropriate activity.`,
    }));
  }
  if (age !== null && age >= 65) return [walking, sitToStand, balance, stretching];
  if (bmi !== null && bmi < 18.5) return [sitToStand, strength, walking, stretching];
  if (bmi !== null && bmi >= 30) return [walking, lowImpact, sitToStand, stretching];
  if (bmi !== null && bmi >= 25) return [walking, sitToStand, strength, stretching];
  return [walking, strength, sitToStand, stretching];
}

function ProgressCard({
  label,
  value,
  goal,
  progress,
}: {
  label: string;
  value: string;
  goal: string;
  progress: number;
}) {
  return (
    <div className="tracker-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="tracker-progress" aria-label={`${progress}% of ${label} goal`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <small>{goal}</small>
    </div>
  );
}

function BmiGuidance({ bmi, age }: { bmi: number; age: number }) {
  const isBelowRange = bmi < 18.5;
  const isHigherRange = bmi >= 25;
  const heading = isBelowRange
    ? "BMI is below the common adult screening range"
    : "BMI is above the common adult screening range";
  const introduction = isBelowRange
    ? "Focus on regular, nutrient-dense meals and strength rather than relying on sugary foods or unreviewed supplements."
    : "Focus on sustainable food quality, portions, and gradual activity rather than crash diets or punishing exercise.";
  const meals = isBelowRange
    ? [
        [
          "Breakfast",
          "Porridge or oats with milk or fortified alternative, fruit, and nuts; or eggs/tofu with whole-grain toast.",
        ],
        [
          "Lunch",
          "Rice or roti with dal, beans, fish, chicken, paneer, or tofu, plus vegetables and curd/yogurt.",
        ],
        [
          "Snack",
          "Fruit with yogurt, nuts or nut butter, roasted chana, hummus, or another protein-rich snack.",
        ],
        [
          "Dinner",
          "A balanced meal with whole grains or potato, vegetables, protein, and a healthy-fat source.",
        ],
      ]
    : [
        [
          "Breakfast",
          "A protein-and-fibre meal such as eggs/tofu with vegetables, or unsweetened oats with fruit and yogurt.",
        ],
        [
          "Lunch",
          "Fill about half the plate with vegetables, then add protein and a moderate portion of rice, roti, or another whole grain.",
        ],
        [
          "Snack",
          "Choose fruit, plain yogurt, roasted chana, or a small portion of unsalted nuts instead of sugary drinks or fried snacks.",
        ],
        [
          "Dinner",
          "Use the same vegetable–protein–whole-grain pattern and eat slowly enough to notice fullness.",
        ],
      ];

  return (
    <section className="card bmi-guidance">
      <p className="eyebrow">BMI wellness guidance</p>
      <div className="bmi-guidance-heading">
        <div>
          <h2>{heading}</h2>
          <p>{introduction}</p>
        </div>
        <span>BMI {bmi.toFixed(1)}</span>
      </div>

      <div className="bmi-guidance-grid">
        <div>
          <h3>Flexible daily meal chart</h3>
          <div className="meal-plan-table">
            {meals.map(([meal, suggestion]) => (
              <div key={meal}>
                <strong>{meal}</strong>
                <p>{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bmi-tip-column">
          <div className="guidance-box">
            <h3>Exercise starting point</h3>
            <p>
              {isBelowRange
                ? "When medically safe, combine comfortable walking with two weekly sessions of beginner strength exercises. Increase gradually and stop if you feel faint, weak, or unwell."
                : `Start with manageable sessions such as 10–15 minutes of walking or low-impact activity, then build toward regular weekly activity. ${age >= 65 ? "Include balance work and use support when needed." : "Add strength work on two days when safe."}`}
            </p>
          </div>
          <div className="guidance-box">
            <h3>Health tips</h3>
            <ul className="bmi-tip-list">
              <li>Track trends weekly rather than reacting to daily weight changes.</li>
              <li>
                Prioritize sleep, regular meals, water, and mostly minimally processed
                foods.
              </li>
              <li>
                Avoid weight-loss medicines, mass-gain products, or high-dose supplements
                unless a qualified clinician recommends them.
              </li>
              {isBelowRange && (
                <li>Seek medical review for unplanned weight loss or poor appetite.</li>
              )}
              {isHigherRange && bmi >= 30 && (
                <li>
                  Consider discussing blood pressure, glucose, cholesterol, and a
                  dietitian-supported plan with a clinician.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="disclaimer">
        BMI is only a screening measure and does not directly measure body fat or account
        for muscle, pregnancy, or every health condition. This sample chart is general,
        not a calorie prescription. Ask a clinician or registered dietitian for a plan
        suited to your medical history, culture, budget, allergies, and preferences.
      </div>
    </section>
  );
}

function DietChart({ logs }: { logs: FoodCategory[] }) {
  const counts = useMemo(
    () =>
      categories.map((category) => ({
        category,
        count: logs.filter((item) => item === category).length,
      })),
    [logs],
  );
  const maximum = Math.max(1, ...counts.map((item) => item.count));
  return (
    <div className="diet-chart" aria-label="Food-group chart">
      <h3>Food-group chart</h3>
      {counts.map((item) => (
        <div className="diet-chart-row" key={item.category}>
          <span>{titleCase(item.category)}</span>
          <div>
            <i style={{ width: `${(item.count / maximum) * 100}%` }} />
          </div>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

function WeeklyChart({
  title,
  logs,
  goal,
  value,
}: {
  title: string;
  logs: DailyHealthLog[];
  goal: number;
  value: (log: DailyHealthLog) => number;
}) {
  const maximum = Math.max(goal, ...logs.map(value), 1);
  return (
    <div className="weekly-chart">
      <h3>{title}</h3>
      <div className="weekly-bars">
        {logs.map((log) => {
          const amount = value(log);
          const day = new Intl.DateTimeFormat("en", { weekday: "short" }).format(
            new Date(`${log.date}T00:00:00`),
          );
          return (
            <div className="weekly-bar" key={log.date}>
              <span title={amount.toLocaleString()}>
                <i style={{ height: `${Math.max(3, (amount / maximum) * 100)}%` }} />
              </span>
              <small>{day}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  min,
  max,
  step = "1",
  value,
  required = false,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: string;
  value: number | null;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type="number"
        min={min}
        max={max}
        step={step}
        defaultValue={value ?? ""}
        required={required}
      />
    </div>
  );
}

function TimeField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type="time" defaultValue={value} required />
    </div>
  );
}

function activityGuidance(age: number | null) {
  if (age === null) return "Set goals that fit your abilities and medical advice.";
  if (age < 5)
    return "For young children, use age-appropriate active play guidance from a pediatrician rather than a step target.";
  if (age < 18)
    return "Ages 5–17 generally aim for at least 60 minutes of moderate-to-vigorous activity daily; involve a parent or guardian.";
  if (age < 65)
    return "Adults generally aim for at least 150 minutes of moderate activity weekly. Steps are one optional way to monitor movement.";
  return "Older adults generally aim for regular aerobic, strength, and balance activity as abilities and health conditions allow.";
}

function stepAnalysis(progress: number, counting: boolean) {
  if (counting) return `${progress}% of your daily goal; live sensor estimate active.`;
  if (progress >= 100) return "Daily step goal reached.";
  if (progress >= 75) return "You are close to your daily step goal.";
  if (progress >= 25) return "Your daily movement is in progress.";
  return "A short comfortable walk can add movement when medically safe.";
}
