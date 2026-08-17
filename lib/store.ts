import { readFileStore, writeFileStore } from "@/lib/file-store";
import type { DataStore } from "@/lib/types";

type StoreBackend = "file" | "google-sheets";

let updateQueue: Promise<unknown> = Promise.resolve();

function configuredBackend(): StoreBackend {
  const value = (process.env.DATA_STORE_BACKEND || "file").trim().toLowerCase();
  if (value === "file" || value === "google-sheets") return value;
  throw new Error(
    `Unsupported DATA_STORE_BACKEND "${value}". Use "file" or "google-sheets".`,
  );
}

async function readFromBackend(): Promise<DataStore> {
  if (configuredBackend() === "google-sheets") {
    const { readGoogleSheetsStore } = await import("@/lib/google-sheets-store");
    return readGoogleSheetsStore();
  }
  return readFileStore();
}

async function writeToBackend(data: DataStore): Promise<void> {
  if (configuredBackend() === "google-sheets") {
    const { writeGoogleSheetsStore } = await import("@/lib/google-sheets-store");
    await writeGoogleSheetsStore(data);
    return;
  }
  await writeFileStore(data);
}

export async function readStore(): Promise<DataStore> {
  return readFromBackend();
}

export function updateStore<T>(mutator: (data: DataStore) => T | Promise<T>): Promise<T> {
  const operation = updateQueue.then(async () => {
    const data = await readFromBackend();
    const result = await mutator(data);
    await writeToBackend(data);
    return result;
  });
  updateQueue = operation.catch(() => undefined);
  return operation;
}
