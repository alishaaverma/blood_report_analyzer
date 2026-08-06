import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DataStore } from "@/lib/types";

const storageDirectory = path.join(process.cwd(), "storage");
const storePath = path.join(storageDirectory, "data.json");
const emptyStore: DataStore = { users: [], reports: [], passwordResets: [] };
let updateQueue: Promise<unknown> = Promise.resolve();

async function ensureStore() {
  await mkdir(storageDirectory, { recursive: true });
  try {
    await readFile(storePath, "utf8");
  } catch {
    await writeFile(storePath, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

export async function readStore(): Promise<DataStore> {
  await ensureStore();
  return JSON.parse(await readFile(storePath, "utf8")) as DataStore;
}

export function updateStore<T>(mutator: (data: DataStore) => T | Promise<T>): Promise<T> {
  const operation = updateQueue.then(async () => {
    const data = await readStore();
    const result = await mutator(data);
    const temporaryPath = `${storePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(data, null, 2), "utf8");
    await rename(temporaryPath, storePath);
    return result;
  });
  updateQueue = operation.catch(() => undefined);
  return operation;
}

export function publicUser<T extends { passwordHash: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  void _passwordHash;
  return safeUser;
}
