import Link from "next/link";
import { redirect } from "next/navigation";
import { FlashNotices } from "@/components/flash-notices";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentUser } from "@/lib/auth";
import { AUTH } from "@/lib/constants";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/reports");
  const query = await searchParams;
  return (
    <main className="page-shell">
      <section className="card medium">
        <p className="eyebrow">Get started</p>
        <h1>Create your account</h1>
        <p className="lead">Keep your reports, profile, and recommendations together.</p>
        <FlashNotices error={query.error} />
        <form action="/api/auth/signup" method="post" className="form-grid">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              minLength={3}
              maxLength={40}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="phoneNumber">Phone number</label>
            <input id="phoneNumber" name="phoneNumber" type="tel" autoComplete="tel" />
          </div>
          <div className="field">
            <label htmlFor="age">Age</label>
            <input id="age" name="age" type="number" min="1" max="120" />
          </div>
          <div className="field">
            <label htmlFor="gender">Gender</label>
            <select id="gender" name="gender">
              <option value="">Prefer not to say</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={AUTH.passwordMinLength}
              autoComplete="new-password"
              required
            />
            <p className="field-help">
              Use at least {AUTH.passwordMinLength} characters.
            </p>
          </div>
          <div className="field field-wide">
            <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
          </div>
        </form>
        <p className="form-footer">
          Already registered? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
