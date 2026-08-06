import Link from "next/link";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main className="page-shell"><section className="card narrow">
      <p className="eyebrow">Account recovery</p><h1>Forgot password?</h1>
      <p className="lead">Enter your account email and we’ll send a six-digit verification code.</p>
      <Notice type="error">{query.error}</Notice>
      <form action="/api/auth/forgot-password" method="post">
        <div className="field"><label htmlFor="email">Account email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
        <SubmitButton pendingText="Sending code…">Send verification code</SubmitButton>
      </form>
      <p className="form-footer"><Link href="/login">Back to log in</Link></p>
    </section></main>
  );
}
