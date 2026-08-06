import { createHash, randomInt, randomUUID } from "node:crypto";
import { formRedirect, textField } from "@/lib/http";
import { sendResetCode } from "@/lib/mail";
import { updateStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = textField(form, "email").toLowerCase();
  if (!email.includes("@")) return formRedirect(request, "/forgot-password", { error: "Enter a valid email address." });
  const code = String(randomInt(100000, 1000000));
  const requestId = randomUUID();
  const outcome = await updateStore((data) => {
    const user = data.users.find((item) => item.email.toLowerCase() === email);
    if (!user) return null;
    const recent = data.passwordResets.find((item) => item.userId === user.id && Date.now() - new Date(item.createdAt).getTime() < 60_000);
    if (recent) return { rateLimited: true as const };
    data.passwordResets = data.passwordResets.filter((item) => item.userId !== user.id);
    data.passwordResets.push({
      id: requestId, userId: user.id, codeDigest: createHash("sha256").update(code).digest("hex"),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), verifiedAt: null,
      failedAttempts: 0, createdAt: new Date().toISOString(),
    });
    return { rateLimited: false as const, email: user.email };
  });
  if (outcome?.rateLimited) return formRedirect(request, "/forgot-password", { error: "Please wait one minute before requesting another code." });
  if (!outcome) return formRedirect(request, "/verify-otp", { request: requestId });
  try {
    const mode = await sendResetCode(outcome.email, code);
    return formRedirect(request, "/verify-otp", { request: requestId, ...(mode === "development" ? { development: "1" } : {}) });
  } catch {
    return formRedirect(request, "/forgot-password", { error: "The verification email could not be sent. Check email settings and try again." });
  }
}
