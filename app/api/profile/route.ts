import { getCurrentUser } from "@/lib/auth";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";
import type { Gender } from "@/lib/types";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return formRedirect(request, "/login", { error: "Please sign in." });
  const form = await request.formData();
  const ageText = textField(form, "age");
  const age = ageText ? Number(ageText) : null;
  const genderText = textField(form, "gender");
  const gender: Gender = ["M", "F", "O"].includes(genderText) ? genderText as Gender : "";
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) return formRedirect(request, "/profile", { error: "Age must be between 1 and 120." });
  await updateStore((data) => { const user = data.users.find((item) => item.id === current.id); if (user) { user.phoneNumber = textField(form, "phoneNumber").slice(0, 20); user.age = age; user.gender = gender; } });
  return formRedirect(request, "/profile", { success: "Profile saved." });
}
