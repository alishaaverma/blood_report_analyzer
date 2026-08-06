import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ request?: string; error?: string }> }) {
  const query = await searchParams;
  if (!query.request) redirect("/forgot-password");
  return (
    <main className="page-shell"><section className="card narrow">
      <p className="eyebrow">Choose a secure password</p><h1>Set new password</h1>
      <p className="lead">Use a password you don’t use on another account.</p>
      <Notice type="error">{query.error}</Notice>
      <form action="/api/auth/reset-password" method="post">
        <input type="hidden" name="requestId" value={query.request} />
        <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required /></div>
        <div className="field"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></div>
        <SubmitButton pendingText="Updating password…">Reset password</SubmitButton>
      </form>
    </section></main>
  );
}
