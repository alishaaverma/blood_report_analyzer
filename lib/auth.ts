import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH } from "@/lib/constants";
import { readStore } from "@/lib/store";
import type { User } from "@/lib/types";

const scrypt = promisify(scryptCallback);

function sessionSecret() {
  return process.env.SESSION_SECRET || "development-only-change-this-secret";
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function encodeSession(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt: Date.now() + AUTH.sessionLifetimeSeconds * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token?: string): { userId: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: string;
      expiresAt: number;
    };
    return value.expiresAt > Date.now() ? { userId: value.userId } : null;
  } catch {
    return null;
  }
}

export function sessionCookie(userId: string) {
  return {
    name: AUTH.cookieName,
    value: encodeSession(userId),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH.sessionLifetimeSeconds,
    },
  };
}

export function expiredSessionCookie() {
  return {
    name: AUTH.cookieName,
    value: "",
    options: { httpOnly: true, path: "/", maxAge: 0 },
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(AUTH.cookieName)?.value;
  const session = decodeSession(token);
  if (!session) return null;
  const data = await readStore();
  return data.users.find((user) => user.id === session.userId) ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=Please+sign+in+to+continue");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/reports?error=Administrator+access+required");
  return user;
}
