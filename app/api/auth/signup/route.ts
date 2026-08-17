import { randomUUID } from "node:crypto";
import { hashPassword, sessionCookie } from "@/lib/auth";
import { AUTH } from "@/lib/constants";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";
import type { User } from "@/lib/types";
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  parseGender,
  parseOptionalAge,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = textField(form, "username");
  const email = textField(form, "email").toLowerCase();
  const password = textField(form, "password");
  const phoneNumber = textField(form, "phoneNumber");
  const age = parseOptionalAge(textField(form, "age"));
  const gender = parseGender(textField(form, "gender"));

  if (!isValidUsername(username))
    return formRedirect(request, "/signup", {
      error:
        "Username must be 3–40 characters and use only letters, numbers, dots, dashes, or underscores.",
    });
  if (!isValidEmail(email))
    return formRedirect(request, "/signup", { error: "Enter a valid email address." });
  if (!isValidPassword(password))
    return formRedirect(request, "/signup", {
      error: `Password must be at least ${AUTH.passwordMinLength} characters.`,
    });
  if (age === undefined)
    return formRedirect(request, "/signup", { error: "Age must be between 1 and 120." });

  const passwordHash = await hashPassword(password);
  try {
    const user = await updateStore((data) => {
      if (
        data.users.some((item) => item.username.toLowerCase() === username.toLowerCase())
      )
        throw new Error("That username is already in use.");
      if (data.users.some((item) => item.email.toLowerCase() === email))
        throw new Error("That email is already in use.");
      const adminEmails = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      const newUser: User = {
        id: randomUUID(),
        username,
        email,
        passwordHash,
        phoneNumber,
        age,
        gender,
        isAdmin: data.users.length === 0 || adminEmails.includes(email),
        location: null,
        createdAt: new Date().toISOString(),
      };
      data.users.push(newUser);
      return newUser;
    });
    const response = formRedirect(request, "/reports", {
      success: "Welcome! Your account is ready.",
    });
    const cookie = sessionCookie(user.id);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return formRedirect(request, "/signup", {
      error: error instanceof Error ? error.message : "Could not create account.",
    });
  }
}
