export const APP_NAME = "Blood Report Analyzer";

export const AUTH = {
  cookieName: "blood_report_session",
  resetCookieName: "blood_report_reset",
  passwordMinLength: 10,
  resetCodeLength: 6,
  resetExpiryMs: 10 * 60 * 1000,
  resetMaxAttempts: 5,
  resetRateLimitMs: 60 * 1000,
  sessionLifetimeSeconds: 7 * 24 * 60 * 60,
} as const;

export const REPORTS = {
  maxUploadBytes: 10 * 1024 * 1024,
  maxUploadLabel: "10 MB",
} as const;

export const LOCATION = {
  defaultRadiusKm: 10,
  maxRadiusKm: 10,
  minRadiusKm: 1,
  maxResultsPerCategory: 15,
} as const;

export const PDF_ERRORS = {
  noRecognizableLines:
    "No recognizable test lines were detected. The PDF layout may not be supported or it may be an image-only scan.",
  unreadable:
    "Could not read this PDF. The file may be damaged, password-protected, or an unsupported image-only scan.",
} as const;
