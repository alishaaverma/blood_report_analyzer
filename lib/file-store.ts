import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DataStore } from "@/lib/types";

const storageDirectory = path.join(process.cwd(), "storage");
const storePath = path.join(storageDirectory, "runtime-data.json");

export const emptyStore = (): DataStore => ({
  users: [],
  reports: [],
  passwordResets: [],
  healthTrackerProfiles: [],
  dailyHealthLogs: [],
});

async function ensureFileStore() {
  await mkdir(storageDirectory, { recursive: true });
  try {
    await access(storePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(storePath, JSON.stringify(emptyStore(), null, 2), "utf8");
  }
}

export function normalizeStore(parsed: Partial<DataStore>): DataStore {
  if (
    !Array.isArray(parsed.users) ||
    !Array.isArray(parsed.reports) ||
    !Array.isArray(parsed.passwordResets)
  ) {
    throw new Error("The configured data store does not contain valid core collections.");
  }

  return {
    users: parsed.users,
    reports: parsed.reports,
    passwordResets: parsed.passwordResets,
    healthTrackerProfiles: Array.isArray(parsed.healthTrackerProfiles)
      ? parsed.healthTrackerProfiles.map((profile) => ({
          ...profile,
          wakeupReminder: profile.wakeupReminder || "07:00",
          exerciseReminder: profile.exerciseReminder || "18:00",
          bedtimeReminder: profile.bedtimeReminder || "22:30",
        }))
      : [],
    dailyHealthLogs: Array.isArray(parsed.dailyHealthLogs)
      ? parsed.dailyHealthLogs.map((log) => ({
          ...log,
          meals: Array.isArray(log.meals) ? log.meals : [],
          exercises: Array.isArray(log.exercises)
            ? log.exercises.map((exercise) => ({
                ...exercise,
                workoutTaskId: exercise.workoutTaskId || null,
              }))
            : [],
          completedRoutineItems: Array.isArray(log.completedRoutineItems)
            ? log.completedRoutineItems
            : [],
        }))
      : [],
  };
}

export async function readFileStore(): Promise<DataStore> {
  await ensureFileStore();
  const parsed = JSON.parse(await readFile(storePath, "utf8")) as Partial<DataStore>;
  return normalizeStore(parsed);
}

export async function writeFileStore(data: DataStore): Promise<void> {
  await ensureFileStore();
  const temporaryPath = `${storePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(data, null, 2), "utf8");
  await rename(temporaryPath, storePath);
}
