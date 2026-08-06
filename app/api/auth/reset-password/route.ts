import { hashPassword } from "@/lib/auth";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const form = await request.formData();
  const requestId = textField(form, "requestId");
  const password = textField(form, "password");
  const confirmPassword = textField(form, "confirmPassword");
  if (password.length < 10) return formRedirect(request, "/reset-password", { request: requestId, error: "Password must be at least 10 characters." });
  if (password !== confirmPassword) return formRedirect(request, "/reset-password", { request: requestId, error: "Passwords do not match." });
  const passwordHash = await hashPassword(password);
  const changed = await updateStore((data) => {
    const resetIndex = data.passwordResets.findIndex((item) => item.id === requestId);
    const reset = data.passwordResets[resetIndex];
    if (!reset?.verifiedAt || Date.now() - new Date(reset.verifiedAt).getTime() > 10 * 60_000) return false;
    const user = data.users.find((item) => item.id === reset.userId);
    if (!user) return false;
    user.passwordHash = passwordHash;
    data.passwordResets.splice(resetIndex, 1);
    return true;
  });
  return changed
    ? formRedirect(request, "/login", { success: "Password reset. You can now log in." })
    : formRedirect(request, "/forgot-password", { error: "Verification expired. Request a new code." });
}
