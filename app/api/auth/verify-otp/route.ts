import { createHash, timingSafeEqual } from "node:crypto";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const form = await request.formData();
  const requestId = textField(form, "requestId");
  const code = textField(form, "code");
  if (!/^\d{6}$/.test(code)) return formRedirect(request, "/verify-otp", { request: requestId, error: "Enter a valid six-digit code." });
  const verified = await updateStore((data) => {
    const reset = data.passwordResets.find((item) => item.id === requestId);
    if (!reset || reset.failedAttempts >= 5 || new Date(reset.expiresAt).getTime() <= Date.now()) return false;
    const actual = Buffer.from(createHash("sha256").update(code).digest("hex"));
    const expected = Buffer.from(reset.codeDigest);
    if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
      reset.verifiedAt = new Date().toISOString();
      return true;
    }
    reset.failedAttempts += 1;
    return false;
  });
  return verified
    ? formRedirect(request, "/reset-password", { request: requestId })
    : formRedirect(request, "/verify-otp", { request: requestId, error: "Incorrect, expired, or unavailable code." });
}
