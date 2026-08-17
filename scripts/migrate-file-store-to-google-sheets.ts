import dotenv from "dotenv";
import { readFileStore } from "../lib/file-store";
import {
  readGoogleSheetsStore,
  writeGoogleSheetsStore,
} from "../lib/google-sheets-store";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

function totalRecords(data: Awaited<ReturnType<typeof readFileStore>>): number {
  return (
    data.users.length +
    data.reports.length +
    data.passwordResets.length +
    data.healthTrackerProfiles.length +
    data.dailyHealthLogs.length
  );
}

async function main() {
  const force = process.argv.includes("--force");
  const source = await readFileStore();
  const destination = await readGoogleSheetsStore();

  if (totalRecords(destination) > 0 && !force) {
    throw new Error(
      "The destination spreadsheet already contains application records. Re-run with --force only if you intend to replace them.",
    );
  }

  await writeGoogleSheetsStore(source);
  const verified = await readGoogleSheetsStore();

  const expectedCounts = {
    users: source.users.length,
    reports: source.reports.length,
    passwordResets: source.passwordResets.length,
    healthTrackerProfiles: source.healthTrackerProfiles.length,
    dailyHealthLogs: source.dailyHealthLogs.length,
  };
  const actualCounts = {
    users: verified.users.length,
    reports: verified.reports.length,
    passwordResets: verified.passwordResets.length,
    healthTrackerProfiles: verified.healthTrackerProfiles.length,
    dailyHealthLogs: verified.dailyHealthLogs.length,
  };

  if (JSON.stringify(expectedCounts) !== JSON.stringify(actualCounts)) {
    throw new Error(
      `Migration verification failed. Expected ${JSON.stringify(expectedCounts)}, received ${JSON.stringify(actualCounts)}.`,
    );
  }

  console.log(
    "Google Sheets migration completed and record counts were verified:",
    actualCounts,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
