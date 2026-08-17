import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { buildDailyHealthReport } from "@/lib/health-report";
import { readStore, updateStore } from "@/lib/store";
import type { DailyHealthLog, HealthTrackerProfile } from "@/lib/types";

export const runtime = "nodejs";

function localDateKey(request: Request) {
  const suppliedDate = new URL(request.url).searchParams.get("today") ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(suppliedDate)
    ? suppliedDate
    : new Date().toISOString().slice(0, 10);
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
    updatedAt: "",
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const today = localDateKey(request);
  const data = await readStore();
  const profile =
    data.healthTrackerProfiles.find((item) => item.userId === user.id) ??
    defaultProfile(user.id);
  const logs = data.dailyHealthLogs
    .filter((log) => log.userId === user.id)
    .sort((left, right) => right.date.localeCompare(left.date));
  const hasToday = logs.some((log) => log.date === today);
  const reportLogs = hasToday ? logs : [emptyLog(user.id, today), ...logs];

  return Response.json({
    reports: reportLogs.map((log) => buildDailyHealthReport(log, profile)),
    today,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { date?: unknown };
  const date = String(body.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "A valid report date is required." }, { status: 400 });
  }

  await updateStore((data) => {
    const existing = data.dailyHealthLogs.some(
      (log) => log.userId === user.id && log.date === date,
    );
    if (!existing) {
      data.dailyHealthLogs.push({
        ...emptyLog(user.id, date),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  return Response.json({ ok: true });
}
