import nodemailer from "nodemailer";

export type MailDeliveryMode = "development" | "email";

export function getMailDeliveryMode(): MailDeliveryMode {
  return process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? "email"
    : "development";
}

export async function sendResetCode(email: string, code: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) {
    console.info(`[development email] Password reset code for ${email}: ${code}`);
    return "development" as const;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || user,
    to: email,
    subject: "Your Blood Report Analyzer verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your Blood Report Analyzer verification code is:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
  return "email" as const;
}
