import { redirect } from "next/navigation";
import { FlashNotices } from "@/components/flash-notices";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { AUTH } from "@/lib/constants";

export const metadata = { title: "Verify code" };

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string; error?: string; development?: string }>;
}) {
  const query = await searchParams;
  if (!query.request) redirect("/forgot-password");
  return (
    <main className="page-shell">
      <section className="card narrow">
        <p className="eyebrow">Security check</p>
        <h1>Enter your code</h1>
        <p className="lead">
          The six-digit code expires in ten minutes and can be used once.
        </p>
        <FlashNotices error={query.error} />
        {query.development && (
          <Notice>
            Development email mode is active. Read the code in the Next.js terminal.
          </Notice>
        )}
        <form action="/api/auth/verify-otp" method="post">
          <input type="hidden" name="requestId" value={query.request} />
          <div className="field">
            <label htmlFor="code">Six-digit code</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={`[0-9]{${AUTH.resetCodeLength}}`}
              maxLength={AUTH.resetCodeLength}
              required
            />
          </div>
          <SubmitButton pendingText="Verifying…">Verify code</SubmitButton>
        </form>
      </section>
    </main>
  );
}
