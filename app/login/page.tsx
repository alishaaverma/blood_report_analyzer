import Link from "next/link";
import { redirect } from "next/navigation";
import { FlashNotices, type FlashQuery } from "@/components/flash-notices";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<FlashQuery>;
}) {
  if (await getCurrentUser()) redirect("/reports");
  const query = await searchParams;
  return (
    <main className="page-shell">
      <section className="card narrow">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in</h1>
        <p className="lead">Access your report history and health guidance.</p>
        <FlashNotices {...query} />
        <form action="/api/auth/login" method="post">
          <div className="field">
            <label htmlFor="login">Username or email</label>
            <input id="login" name="login" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
        </form>
        <p className="form-footer">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
        <p className="form-footer">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
