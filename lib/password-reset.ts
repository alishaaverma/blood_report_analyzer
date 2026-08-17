import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { AUTH } from "@/lib/constants";
import { getMailDeliveryMode, sendResetCode, type MailDeliveryMode } from "@/lib/mail";
import { updateStore } from "@/lib/store";

export class ResetEmailError extends Error {
  constructor() {
    super("The verification email could not be sent.");
    this.name = "ResetEmailError";
  }
}

export interface PasswordResetRequest {
  requestId: string;
  deliveryMode: MailDeliveryMode;
  expiresInSeconds: number;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function digestMatches(value: string, expectedHex: string | null | undefined) {
  if (!expectedHex) return false;
  const actual = Buffer.from(digest(value), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequest> {
  const code = String(
    randomInt(10 ** (AUTH.resetCodeLength - 1), 10 ** AUTH.resetCodeLength),
  );
  const newRequestId = randomUUID();
  const prepared = await updateStore((data) => {
    const user = data.users.find((item) => item.email.toLowerCase() === email);
    if (!user) return null;

    const recent = data.passwordResets.find(
      (item) =>
        item.userId === user.id &&
        Date.now() - new Date(item.createdAt).getTime() < AUTH.resetRateLimitMs,
    );
    if (recent) {
      return { requestId: recent.id, recipient: null };
    }

    data.passwordResets = data.passwordResets.filter((item) => item.userId !== user.id);
    data.passwordResets.push({
      id: newRequestId,
      userId: user.id,
      codeDigest: digest(code),
      resetTokenDigest: null,
      expiresAt: new Date(Date.now() + AUTH.resetExpiryMs).toISOString(),
      verifiedAt: null,
      failedAttempts: 0,
      createdAt: new Date().toISOString(),
    });
    return { requestId: newRequestId, recipient: user.email };
  });

  const requestId = prepared?.requestId ?? newRequestId;
  const deliveryMode = getMailDeliveryMode();
  if (prepared?.recipient) {
    try {
      await sendResetCode(prepared.recipient, code);
    } catch (error) {
      await updateStore((data) => {
        data.passwordResets = data.passwordResets.filter((item) => item.id !== requestId);
      });
      console.error("Could not send password-reset email:", error);
      throw new ResetEmailError();
    }
  }

  return {
    requestId,
    deliveryMode,
    expiresInSeconds: Math.floor(AUTH.resetExpiryMs / 1000),
  };
}

export async function verifyPasswordResetCode(requestId: string, code: string) {
  const resetToken = randomBytes(32).toString("base64url");
  const verified = await updateStore((data) => {
    const reset = data.passwordResets.find((item) => item.id === requestId);
    if (
      !reset ||
      reset.verifiedAt ||
      reset.failedAttempts >= AUTH.resetMaxAttempts ||
      new Date(reset.expiresAt).getTime() <= Date.now()
    ) {
      return false;
    }

    if (!digestMatches(code, reset.codeDigest)) {
      reset.failedAttempts += 1;
      return false;
    }

    reset.verifiedAt = new Date().toISOString();
    reset.resetTokenDigest = digest(resetToken);
    return true;
  });
  return verified ? resetToken : null;
}

export async function completePasswordReset(
  requestId: string,
  resetToken: string,
  password: string,
) {
  return updateStore(async (data) => {
    const resetIndex = data.passwordResets.findIndex((item) => item.id === requestId);
    const reset = data.passwordResets[resetIndex];
    if (
      !reset?.verifiedAt ||
      Date.now() - new Date(reset.verifiedAt).getTime() > AUTH.resetExpiryMs ||
      !digestMatches(resetToken, reset.resetTokenDigest)
    ) {
      return false;
    }

    const user = data.users.find((item) => item.id === reset.userId);
    if (!user) return false;
    user.passwordHash = await hashPassword(password);
    data.passwordResets.splice(resetIndex, 1);
    return true;
  });
}
