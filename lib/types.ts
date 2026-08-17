export type Gender = "M" | "F" | "O" | "";
export type ReportStatus = "pending" | "normal" | "abnormal";
export type Direction = "high" | "low";

export interface LocationProfile {
  latitude: number;
  longitude: number;
  placeName: string;
  fullAddress: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  age: number | null;
  gender: Gender;
  isAdmin: boolean;
  location: LocationProfile | null;
  createdAt: string;
}

export interface TestResult {
  testName: string;
  value: number;
  unit: string;
  normalMin: number | null;
  normalMax: number | null;
  isAbnormal: boolean;
  direction: "high" | "low" | "normal" | "unknown";
}

export interface Report {
  id: string;
  userId: string;
  title: string;
  originalFileName: string;
  storedFileName: string;
  rawExtractedText: string;
  status: ReportStatus;
  results: TestResult[];
  parseError: string;
  uploadedAt: string;
  analyzedAt: string | null;
}

export interface PasswordReset {
  id: string;
  userId: string;
  codeDigest: string;
  resetTokenDigest: string | null;
  expiresAt: string;
  verifiedAt: string | null;
  failedAttempts: number;
  createdAt: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodCategory =
  | "vegetables"
  | "fruit"
  | "protein"
  | "grains"
  | "dairy"
  | "other";
export type ExerciseIntensity = "light" | "moderate" | "vigorous";
export type WorkoutTaskId =
  | "walking"
  | "sit-to-stand"
  | "strength"
  | "stretching"
  | "balance"
  | "low-impact";
export type RoutineItemId =
  | "wake-on-time"
  | "morning-light"
  | "balanced-meals"
  | "hydration"
  | "movement"
  | "screen-breaks"
  | "wind-down"
  | "bed-on-time";

export interface HealthTrackerProfile {
  userId: string;
  heightCm: number | null;
  weightKg: number | null;
  stepGoal: number;
  waterGoalMl: number;
  wakeupReminder: string;
  breakfastReminder: string;
  lunchReminder: string;
  dinnerReminder: string;
  exerciseReminder: string;
  bedtimeReminder: string;
  waterReminderMinutes: number;
  updatedAt: string;
}

export interface MealLog {
  id: string;
  type: MealType;
  category: FoodCategory;
  name: string;
  loggedAt: string;
}

export interface ExerciseLog {
  id: string;
  name: string;
  durationMinutes: number;
  intensity: ExerciseIntensity;
  workoutTaskId: WorkoutTaskId | null;
  loggedAt: string;
}

export interface DailyHealthLog {
  id: string;
  userId: string;
  date: string;
  steps: number;
  waterMl: number;
  meals: MealLog[];
  exercises: ExerciseLog[];
  completedRoutineItems: RoutineItemId[];
  updatedAt: string;
}

export interface TestReference {
  testName: string;
  aliases: string[];
  unit: string;
  normalMin: number;
  normalMax: number;
}

export interface ConditionMapping {
  testName: string;
  direction: Direction;
  conditionName: string;
  description: string;
  dietAdvice: string;
  exerciseAdvice: string;
  medicines: string[];
  consultSpecialty: string;
  severityNote?: string;
}

export interface DataStore {
  users: User[];
  reports: Report[];
  passwordResets: PasswordReset[];
  healthTrackerProfiles: HealthTrackerProfile[];
  dailyHealthLogs: DailyHealthLog[];
}

export interface NearbyPlace {
  name: string;
  category: "hospital" | "clinic" | "doctor" | "pharmacy";
  lat: number;
  lng: number;
  address: string;
  distanceKm: number;
}
