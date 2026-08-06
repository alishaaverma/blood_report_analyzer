import nodemailer from "nodemailer";

export async function sendResetCode(email: string, code: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) {
    console.info(`[development email] Password reset code for ${email}: ${code}`);
    return "development" as const;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user, pass: password },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || user,
    to: email,
    subject: "Your Blood Report Analyzer verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });
  return "email" as const;
}
