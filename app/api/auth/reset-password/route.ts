import { type NextRequest, NextResponse } from "next/server";
import { AUTH } from "@/lib/constants";
import { formRedirect, inputField, readRequestInput } from "@/lib/http";
import { completePasswordReset } from "@/lib/password-reset";

export const runtime = "nodejs";

function expireResetCookie(response: NextResponse) {
  response.cookies.set(AUTH.resetCookieName, "", {
    httpOnly: true,
    path: "/api/auth/reset-password",
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  const input = await readRequestInput(request);
  const requestId = inputField(input, "requestId");
  const resetToken =
    input.format === "json"
      ? inputField(input, "resetToken")
      : (request.cookies.get(AUTH.resetCookieName)?.value ?? "");
  const password = inputField(input, "password", false);
  const confirmPassword = inputField(input, "confirmPassword", false);
  const redirectParams = { request: requestId };

  if (password.length < AUTH.passwordMinLength) {
    const error = `Password must be at least ${AUTH.passwordMinLength} characters.`;
    return input.format === "json"
      ? NextResponse.json({ ok: false, error }, { status: 400 })
      : formRedirect(request, "/reset-password", { ...redirectParams, error });
  }
  if (
    (input.format === "form" || confirmPassword.length > 0) &&
    password !== confirmPassword
  ) {
    const error = "Passwords do not match.";
    return input.format === "json"
      ? NextResponse.json({ ok: false, error }, { status: 400 })
      : formRedirect(request, "/reset-password", { ...redirectParams, error });
  }

  const changed = await completePasswordReset(requestId, resetToken, password);
  if (!changed) {
    const error = "Verification expired or is invalid. Request a new code.";
    const response =
      input.format === "json"
        ? NextResponse.json({ ok: false, error }, { status: 400 })
        : formRedirect(request, "/forgot-password", { error });
    return input.format === "form" ? expireResetCookie(response) : response;
  }

  const response =
    input.format === "json"
      ? NextResponse.json({ ok: true, message: "Password reset successfully." })
      : formRedirect(request, "/login", {
          success: "Password reset. You can now log in.",
        });
  return input.format === "form" ? expireResetCookie(response) : response;
}
