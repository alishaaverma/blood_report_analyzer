import { randomUUID } from "node:crypto";
import { hashPassword, sessionCookie } from "@/lib/auth";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";
import type { Gender, User } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = textField(form, "username");
  const email = textField(form, "email").toLowerCase();
  const password = textField(form, "password");
  const phoneNumber = textField(form, "phoneNumber");
  const ageText = textField(form, "age");
  const genderText = textField(form, "gender");
  const gender: Gender = ["M", "F", "O"].includes(genderText) ? genderText as Gender : "";
  const age = ageText ? Number(ageText) : null;

  if (!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) return formRedirect(request, "/signup", { error: "Username must be 3–40 characters and use only letters, numbers, dots, dashes, or underscores." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return formRedirect(request, "/signup", { error: "Enter a valid email address." });
  if (password.length < 10) return formRedirect(request, "/signup", { error: "Password must be at least 10 characters." });
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) return formRedirect(request, "/signup", { error: "Age must be between 1 and 120." });

  const passwordHash = await hashPassword(password);
  try {
    const user = await updateStore((data) => {
      if (data.users.some((item) => item.username.toLowerCase() === username.toLowerCase())) throw new Error("That username is already in use.");
      if (data.users.some((item) => item.email.toLowerCase() === email)) throw new Error("That email is already in use.");
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
      const newUser: User = {
        id: randomUUID(), username, email, passwordHash, phoneNumber, age, gender,
        isAdmin: data.users.length === 0 || adminEmails.includes(email),
        location: null, createdAt: new Date().toISOString(),
      };
      data.users.push(newUser);
      return newUser;
    });
    const response = formRedirect(request, "/reports", { success: "Welcome! Your account is ready." });
    const cookie = sessionCookie(user.id);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return formRedirect(request, "/signup", { error: error instanceof Error ? error.message : "Could not create account." });
  }
}
