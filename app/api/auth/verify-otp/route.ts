import { NextResponse } from "next/server";
import { AUTH } from "@/lib/constants";
import { formRedirect, inputField, readRequestInput } from "@/lib/http";
import { verifyPasswordResetCode } from "@/lib/password-reset";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = await readRequestInput(request);
  const requestId = inputField(input, "requestId");
  const code = inputField(input, "code");
  if (!new RegExp(`^\\d{${AUTH.resetCodeLength}}$`).test(code)) {
    const error = `Enter a valid ${AUTH.resetCodeLength}-digit code.`;
    return input.format === "json"
      ? NextResponse.json({ ok: false, error }, { status: 400 })
      : formRedirect(request, "/verify-otp", {
          request: requestId,
          error,
        });
  }

  const resetToken = await verifyPasswordResetCode(requestId, code);
  if (!resetToken) {
    const error = "Incorrect, expired, or unavailable code.";
    return input.format === "json"
      ? NextResponse.json({ ok: false, error }, { status: 400 })
      : formRedirect(request, "/verify-otp", {
          request: requestId,
          error,
        });
  }

  if (input.format === "json") {
    return NextResponse.json({
      ok: true,
      message: "Code verified.",
      requestId,
      resetToken,
    });
  }

  const response = formRedirect(request, "/reset-password", {
    request: requestId,
  });
  response.cookies.set(AUTH.resetCookieName, resetToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/reset-password",
    maxAge: Math.floor(AUTH.resetExpiryMs / 1000),
  });
  return response;
}
