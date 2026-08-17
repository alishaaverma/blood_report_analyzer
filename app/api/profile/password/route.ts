import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { AUTH } from "@/lib/constants";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return formRedirect(request, "/login", { error: "Please sign in." });
  const form = await request.formData();
  const currentPassword = textField(form, "currentPassword");
  const newPassword = textField(form, "newPassword");
  const confirmNewPassword = textField(form, "confirmNewPassword");
  if (!(await verifyPassword(currentPassword, current.passwordHash)))
    return formRedirect(request, "/profile", { error: "Current password is incorrect." });
  if (newPassword.length < AUTH.passwordMinLength)
    return formRedirect(request, "/profile", {
      error: `New password must be at least ${AUTH.passwordMinLength} characters.`,
    });
  if (newPassword !== confirmNewPassword)
    return formRedirect(request, "/profile", {
      error: "New password and confirmation do not match.",
    });
  const passwordHash = await hashPassword(newPassword);
  await updateStore((data) => {
    const user = data.users.find((item) => item.id === current.id);
    if (user) user.passwordHash = passwordHash;
  });
  return formRedirect(request, "/profile", { success: "Password changed." });
}
