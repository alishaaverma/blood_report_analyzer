import { NextResponse } from "next/server";
import { formRedirect, inputField, readRequestInput } from "@/lib/http";
import { requestPasswordReset, ResetEmailError } from "@/lib/password-reset";
import { isValidEmail } from "@/lib/validation";

export const runtime = "nodejs";

const successMessage =
  "If an account exists for that email, a verification code has been sent.";

export async function POST(request: Request) {
  const input = await readRequestInput(request);
  const email = inputField(input, "email").toLowerCase();
  if (!isValidEmail(email)) {
    const error = "Enter a valid email address.";
    return input.format === "json"
      ? NextResponse.json({ ok: false, error }, { status: 400 })
      : formRedirect(request, "/forgot-password", { error });
  }

  try {
    const result = await requestPasswordReset(email);
    if (input.format === "json") {
      return NextResponse.json({
        ok: true,
        message: successMessage,
        requestId: result.requestId,
        expiresInSeconds: result.expiresInSeconds,
        developmentMode: result.deliveryMode === "development",
      });
    }
    return formRedirect(request, "/verify-otp", {
      request: result.requestId,
      ...(result.deliveryMode === "development" ? { development: "1" } : {}),
    });
  } catch (error) {
    if (!(error instanceof ResetEmailError)) throw error;
    const message =
      "The verification email could not be sent. Check email settings and try again.";
    return input.format === "json"
      ? NextResponse.json({ ok: false, error: message }, { status: 502 })
      : formRedirect(request, "/forgot-password", { error: message });
  }
}
