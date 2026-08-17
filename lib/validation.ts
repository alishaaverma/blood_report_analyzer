import { AUTH } from "@/lib/constants";
import type { Gender } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,40}$/;
const VALID_GENDERS = new Set<Gender>(["", "M", "F", "O"]);

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(value);
}

export function isValidPassword(value: string) {
  return value.length >= AUTH.passwordMinLength;
}

export function parseOptionalAge(value: string): number | null | undefined {
  if (!value) return null;
  const age = Number(value);
  return Number.isInteger(age) && age >= 1 && age <= 120 ? age : undefined;
}

export function parseGender(value: string): Gender {
  return VALID_GENDERS.has(value as Gender) ? (value as Gender) : "";
}

export function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
