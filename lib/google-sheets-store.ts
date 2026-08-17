import { google, type sheets_v4 } from "googleapis";
import { emptyStore, normalizeStore } from "@/lib/file-store";
import type {
  DailyHealthLog,
  DataStore,
  ExerciseIntensity,
  FoodCategory,
  Gender,
  MealType,
  ReportStatus,
  RoutineItemId,
  TestResult,
  WorkoutTaskId,
} from "@/lib/types";

type Cell = string | number | boolean;
type Row = Cell[];

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TEXT_CHUNK_SIZE = 40_000;

const tabHeaders = {
  users: [
    "id",
    "username",
    "email",
    "password_hash",
    "phone_number",
    "age",
    "gender",
    "is_admin",
    "location_latitude",
    "location_longitude",
    "location_place_name",
    "location_full_address",
    "location_updated_at",
    "created_at",
  ],
  reports: [
    "id",
    "user_id",
    "title",
    "original_file_name",
    "stored_file_name",
    "status",
    "parse_error",
    "uploaded_at",
    "analyzed_at",
  ],
  report_results: [
    "report_id",
    "result_index",
    "test_name",
    "value",
    "unit",
    "normal_min",
    "normal_max",
    "is_abnormal",
    "direction",
  ],
  report_text_chunks: ["report_id", "chunk_index", "text"],
  password_resets: [
    "id",
    "user_id",
    "code_digest",
    "reset_token_digest",
    "expires_at",
    "verified_at",
    "failed_attempts",
    "created_at",
  ],
  health_tracker_profiles: [
    "user_id",
    "height_cm",
    "weight_kg",
    "step_goal",
    "water_goal_ml",
    "wakeup_reminder",
    "breakfast_reminder",
    "lunch_reminder",
    "dinner_reminder",
    "exercise_reminder",
    "bedtime_reminder",
    "water_reminder_minutes",
    "updated_at",
  ],
  daily_health_logs: ["id", "user_id", "date", "steps", "water_ml", "updated_at"],
  meal_logs: [
    "daily_log_id",
    "user_id",
    "date",
    "id",
    "type",
    "category",
    "name",
    "logged_at",
  ],
  exercise_logs: [
    "daily_log_id",
    "user_id",
    "date",
    "id",
    "name",
    "duration_minutes",
    "intensity",
    "workout_task_id",
    "logged_at",
  ],
  daily_routine_items: ["daily_log_id", "user_id", "date", "routine_item_id"],
  _store_meta: ["tab_name", "row_count", "updated_at"],
} as const;

type TabName = keyof typeof tabHeaders;
const tabNames = Object.keys(tabHeaders) as TabName[];
const dataTabNames = tabNames.filter((name) => name !== "_store_meta");

interface SheetsContext {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
}

let contextPromise: Promise<SheetsContext> | undefined;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`${name} is required for Google Sheets storage or migration.`);
  return value;
}

function spreadsheetIdFromEnvironment(): string {
  const configured = requiredEnvironment("GOOGLE_SHEETS_SPREADSHEET_ID");
  const urlMatch = configured.match(/\/spreadsheets\/d\/([^/]+)/);
  return urlMatch?.[1] || configured;
}

function createAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const configuredKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if ((email && !configuredKey) || (!email && configuredKey)) {
    throw new Error(
      "Set both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, or use GOOGLE_APPLICATION_CREDENTIALS.",
    );
  }

  const credentials =
    email && configuredKey
      ? {
          client_email: email,
          private_key: configuredKey.replace(/\\n/g, "\n"),
        }
      : undefined;

  return new google.auth.GoogleAuth({ credentials, scopes: [SHEETS_SCOPE] });
}

async function ensureRequiredTabs(context: SheetsContext): Promise<void> {
  const response = await context.sheets.spreadsheets.get({
    spreadsheetId: context.spreadsheetId,
    fields: "sheets.properties.title",
  });
  const existing = new Set(
    (response.data.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)),
  );
  const missing = tabNames.filter((name) => !existing.has(name));
  if (!missing.length) return;

  await context.sheets.spreadsheets.batchUpdate({
    spreadsheetId: context.spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: 1_000,
              columnCount: Math.max(tabHeaders[title].length, 4),
              frozenRowCount: 1,
            },
          },
        },
      })),
    },
  });
}

async function sheetsContext(): Promise<SheetsContext> {
  if (!contextPromise) {
    contextPromise = (async () => {
      const context = {
        sheets: google.sheets({ version: "v4", auth: createAuth() }),
        spreadsheetId: spreadsheetIdFromEnvironment(),
      };
      await ensureRequiredTabs(context);
      return context;
    })().catch((error) => {
      contextPromise = undefined;
      throw error;
    });
  }
  return contextPromise;
}

function quotedTab(name: TabName): string {
  return `'${name.replaceAll("'", "''")}'`;
}

function cellString(row: Row, index: number): string {
  const value = row[index];
  return value === undefined || value === null ? "" : String(value);
}

function cellNumber(row: Row, index: number, fallback = 0): number {
  const value = Number(row[index]);
  return Number.isFinite(value) ? value : fallback;
}

function optionalNumber(row: Row, index: number): number | null {
  if (row[index] === "" || row[index] === undefined || row[index] === null) return null;
  const value = Number(row[index]);
  return Number.isFinite(value) ? value : null;
}

function cellBoolean(row: Row, index: number): boolean {
  const value = row[index];
  return value === true || String(value).toLowerCase() === "true" || value === 1;
}

function splitText(value: string): string[] {
  if (!value) return [];
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += TEXT_CHUNK_SIZE) {
    chunks.push(value.slice(offset, offset + TEXT_CHUNK_SIZE));
  }
  return chunks;
}

function rowsForStore(data: DataStore): Record<TabName, Row[]> {
  const users = data.users.map<Row>((user) => [
    user.id,
    user.username,
    user.email,
    user.passwordHash,
    user.phoneNumber,
    user.age ?? "",
    user.gender,
    user.isAdmin,
    user.location?.latitude ?? "",
    user.location?.longitude ?? "",
    user.location?.placeName ?? "",
    user.location?.fullAddress ?? "",
    user.location?.updatedAt ?? "",
    user.createdAt,
  ]);
  const reports = data.reports.map<Row>((report) => [
    report.id,
    report.userId,
    report.title,
    report.originalFileName,
    report.storedFileName,
    report.status,
    report.parseError,
    report.uploadedAt,
    report.analyzedAt ?? "",
  ]);
  const reportResults = data.reports.flatMap((report) =>
    report.results.map<Row>((result, index) => [
      report.id,
      index,
      result.testName,
      result.value,
      result.unit,
      result.normalMin ?? "",
      result.normalMax ?? "",
      result.isAbnormal,
      result.direction,
    ]),
  );
  const reportTextChunks = data.reports.flatMap((report) =>
    splitText(report.rawExtractedText).map<Row>((chunk, index) => [
      report.id,
      index,
      chunk,
    ]),
  );
  const passwordResets = data.passwordResets.map<Row>((reset) => [
    reset.id,
    reset.userId,
    reset.codeDigest,
    reset.resetTokenDigest ?? "",
    reset.expiresAt,
    reset.verifiedAt ?? "",
    reset.failedAttempts,
    reset.createdAt,
  ]);
  const healthTrackerProfiles = data.healthTrackerProfiles.map<Row>((profile) => [
    profile.userId,
    profile.heightCm ?? "",
    profile.weightKg ?? "",
    profile.stepGoal,
    profile.waterGoalMl,
    profile.wakeupReminder,
    profile.breakfastReminder,
    profile.lunchReminder,
    profile.dinnerReminder,
    profile.exerciseReminder,
    profile.bedtimeReminder,
    profile.waterReminderMinutes,
    profile.updatedAt,
  ]);
  const dailyHealthLogs = data.dailyHealthLogs.map<Row>((log) => [
    log.id,
    log.userId,
    log.date,
    log.steps,
    log.waterMl,
    log.updatedAt,
  ]);
  const mealLogs = data.dailyHealthLogs.flatMap((log) =>
    log.meals.map<Row>((meal) => [
      log.id,
      log.userId,
      log.date,
      meal.id,
      meal.type,
      meal.category,
      meal.name,
      meal.loggedAt,
    ]),
  );
  const exerciseLogs = data.dailyHealthLogs.flatMap((log) =>
    log.exercises.map<Row>((exercise) => [
      log.id,
      log.userId,
      log.date,
      exercise.id,
      exercise.name,
      exercise.durationMinutes,
      exercise.intensity,
      exercise.workoutTaskId ?? "",
      exercise.loggedAt,
    ]),
  );
  const dailyRoutineItems = data.dailyHealthLogs.flatMap((log) =>
    log.completedRoutineItems.map<Row>((item) => [log.id, log.userId, log.date, item]),
  );
  const updatedAt = new Date().toISOString();
  const counts: Partial<Record<TabName, number>> = {
    users: users.length,
    reports: reports.length,
    report_results: reportResults.length,
    report_text_chunks: reportTextChunks.length,
    password_resets: passwordResets.length,
    health_tracker_profiles: healthTrackerProfiles.length,
    daily_health_logs: dailyHealthLogs.length,
    meal_logs: mealLogs.length,
    exercise_logs: exerciseLogs.length,
    daily_routine_items: dailyRoutineItems.length,
  };
  const meta = dataTabNames.map<Row>((name) => [name, counts[name] || 0, updatedAt]);

  return {
    users,
    reports,
    report_results: reportResults,
    report_text_chunks: reportTextChunks,
    password_resets: passwordResets,
    health_tracker_profiles: healthTrackerProfiles,
    daily_health_logs: dailyHealthLogs,
    meal_logs: mealLogs,
    exercise_logs: exerciseLogs,
    daily_routine_items: dailyRoutineItems,
    _store_meta: meta,
  };
}

function rowsWithoutHeader(values: Row[] | undefined, limit?: number): Row[] {
  const rows = (values || []).slice(1);
  return limit === undefined ? rows : rows.slice(0, limit);
}

function storeFromRows(tables: Record<TabName, Row[]>): DataStore {
  const metaCounts = new Map(
    rowsWithoutHeader(tables._store_meta).map((row) => [
      cellString(row, 0) as TabName,
      cellNumber(row, 1),
    ]),
  );
  const rows = (name: Exclude<TabName, "_store_meta">) =>
    rowsWithoutHeader(tables[name], metaCounts.get(name));

  const resultsByReport = new Map<string, Array<{ index: number; value: TestResult }>>();
  for (const row of rows("report_results")) {
    const reportId = cellString(row, 0);
    if (!reportId) continue;
    const result: TestResult = {
      testName: cellString(row, 2),
      value: cellNumber(row, 3),
      unit: cellString(row, 4),
      normalMin: optionalNumber(row, 5),
      normalMax: optionalNumber(row, 6),
      isAbnormal: cellBoolean(row, 7),
      direction: cellString(row, 8) as TestResult["direction"],
    };
    const existing = resultsByReport.get(reportId) || [];
    existing.push({ index: cellNumber(row, 1), value: result });
    resultsByReport.set(reportId, existing);
  }

  const textByReport = new Map<string, Array<{ index: number; text: string }>>();
  for (const row of rows("report_text_chunks")) {
    const reportId = cellString(row, 0);
    if (!reportId) continue;
    const existing = textByReport.get(reportId) || [];
    existing.push({ index: cellNumber(row, 1), text: cellString(row, 2) });
    textByReport.set(reportId, existing);
  }

  const logs = new Map<string, DailyHealthLog>();
  for (const row of rows("daily_health_logs")) {
    const id = cellString(row, 0);
    if (!id) continue;
    logs.set(id, {
      id,
      userId: cellString(row, 1),
      date: cellString(row, 2),
      steps: cellNumber(row, 3),
      waterMl: cellNumber(row, 4),
      meals: [],
      exercises: [],
      completedRoutineItems: [],
      updatedAt: cellString(row, 5),
    });
  }
  for (const row of rows("meal_logs")) {
    const log = logs.get(cellString(row, 0));
    if (!log) continue;
    log.meals.push({
      id: cellString(row, 3),
      type: cellString(row, 4) as MealType,
      category: cellString(row, 5) as FoodCategory,
      name: cellString(row, 6),
      loggedAt: cellString(row, 7),
    });
  }
  for (const row of rows("exercise_logs")) {
    const log = logs.get(cellString(row, 0));
    if (!log) continue;
    log.exercises.push({
      id: cellString(row, 3),
      name: cellString(row, 4),
      durationMinutes: cellNumber(row, 5),
      intensity: cellString(row, 6) as ExerciseIntensity,
      workoutTaskId: (cellString(row, 7) || null) as WorkoutTaskId | null,
      loggedAt: cellString(row, 8),
    });
  }
  for (const row of rows("daily_routine_items")) {
    const log = logs.get(cellString(row, 0));
    if (log) log.completedRoutineItems.push(cellString(row, 3) as RoutineItemId);
  }

  const data: DataStore = {
    users: rows("users")
      .filter((row) => cellString(row, 0))
      .map((row) => {
        const latitude = optionalNumber(row, 8);
        const longitude = optionalNumber(row, 9);
        return {
          id: cellString(row, 0),
          username: cellString(row, 1),
          email: cellString(row, 2),
          passwordHash: cellString(row, 3),
          phoneNumber: cellString(row, 4),
          age: optionalNumber(row, 5),
          gender: cellString(row, 6) as Gender,
          isAdmin: cellBoolean(row, 7),
          location:
            latitude === null || longitude === null
              ? null
              : {
                  latitude,
                  longitude,
                  placeName: cellString(row, 10),
                  fullAddress: cellString(row, 11),
                  updatedAt: cellString(row, 12),
                },
          createdAt: cellString(row, 13),
        };
      }),
    reports: rows("reports")
      .filter((row) => cellString(row, 0))
      .map((row) => {
        const id = cellString(row, 0);
        return {
          id,
          userId: cellString(row, 1),
          title: cellString(row, 2),
          originalFileName: cellString(row, 3),
          storedFileName: cellString(row, 4),
          status: cellString(row, 5) as ReportStatus,
          parseError: cellString(row, 6),
          uploadedAt: cellString(row, 7),
          analyzedAt: cellString(row, 8) || null,
          results: (resultsByReport.get(id) || [])
            .sort((a, b) => a.index - b.index)
            .map((item) => item.value),
          rawExtractedText: (textByReport.get(id) || [])
            .sort((a, b) => a.index - b.index)
            .map((item) => item.text)
            .join(""),
        };
      }),
    passwordResets: rows("password_resets")
      .filter((row) => cellString(row, 0))
      .map((row) => ({
        id: cellString(row, 0),
        userId: cellString(row, 1),
        codeDigest: cellString(row, 2),
        resetTokenDigest: cellString(row, 3) || null,
        expiresAt: cellString(row, 4),
        verifiedAt: cellString(row, 5) || null,
        failedAttempts: cellNumber(row, 6),
        createdAt: cellString(row, 7),
      })),
    healthTrackerProfiles: rows("health_tracker_profiles")
      .filter((row) => cellString(row, 0))
      .map((row) => ({
        userId: cellString(row, 0),
        heightCm: optionalNumber(row, 1),
        weightKg: optionalNumber(row, 2),
        stepGoal: cellNumber(row, 3),
        waterGoalMl: cellNumber(row, 4),
        wakeupReminder: cellString(row, 5),
        breakfastReminder: cellString(row, 6),
        lunchReminder: cellString(row, 7),
        dinnerReminder: cellString(row, 8),
        exerciseReminder: cellString(row, 9),
        bedtimeReminder: cellString(row, 10),
        waterReminderMinutes: cellNumber(row, 11),
        updatedAt: cellString(row, 12),
      })),
    dailyHealthLogs: Array.from(logs.values()),
  };

  return normalizeStore(data);
}

function columnName(columnCount: number): string {
  let value = columnCount;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

export async function readGoogleSheetsStore(): Promise<DataStore> {
  const context = await sheetsContext();
  const response = await context.sheets.spreadsheets.values.batchGet({
    spreadsheetId: context.spreadsheetId,
    ranges: tabNames.map(
      (name) => `${quotedTab(name)}!A1:${columnName(tabHeaders[name].length)}`,
    ),
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const tables = Object.fromEntries(
    tabNames.map((name, index) => [
      name,
      (response.data.valueRanges?.[index]?.values || []) as Row[],
    ]),
  ) as Record<TabName, Row[]>;

  if (!tables.users.length && !tables._store_meta.length) return emptyStore();
  return storeFromRows(tables);
}

export async function writeGoogleSheetsStore(data: DataStore): Promise<void> {
  const context = await sheetsContext();
  const rowsByTab = rowsForStore(data);

  await context.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: context.spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: tabNames.map((name) => ({
        range: `${quotedTab(name)}!A1`,
        majorDimension: "ROWS",
        values: [[...tabHeaders[name]], ...rowsByTab[name]],
      })),
    },
  });

  const staleRanges = tabNames.map((name) => {
    const firstStaleRow = rowsByTab[name].length + 2;
    return `${quotedTab(name)}!A${firstStaleRow}:${columnName(tabHeaders[name].length)}`;
  });
  try {
    await context.sheets.spreadsheets.values.batchClear({
      spreadsheetId: context.spreadsheetId,
      requestBody: { ranges: staleRanges },
    });
  } catch (error) {
    // Row counts in _store_meta prevent stale rows from being read if cleanup is interrupted.
    console.warn("Google Sheets data was saved, but stale-row cleanup failed.", error);
  }
}

export const googleSheetsTabNames = [...tabNames];
