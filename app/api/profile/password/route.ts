import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return formRedirect(request, "/login", { error: "Please sign in." });
  const form = await request.formData();
  const currentPassword = textField(form, "currentPassword");
  const newPassword = textField(form, "newPassword");
  if (!await verifyPassword(currentPassword, current.passwordHash)) return formRedirect(request, "/profile", { error: "Current password is incorrect." });
  if (newPassword.length < 10) return formRedirect(request, "/profile", { error: "New password must be at least 10 characters." });
  const passwordHash = await hashPassword(newPassword);
  await updateStore((data) => { const user = data.users.find((item) => item.id === current.id); if (user) user.passwordHash = passwordHash; });
  return formRedirect(request, "/profile", { success: "Password changed." });
}
