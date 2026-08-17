import Link from "next/link";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { FlashNotices, type FlashQuery } from "@/components/flash-notices";
import { LocationManager } from "@/components/location-manager";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { AUTH } from "@/lib/constants";

export const metadata = { title: "My profile" };

function displayGender(value: string) {
  if (value === "M") return "Male";
  if (value === "F") return "Female";
  if (value === "O") return "Other";
  return "Not provided";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<FlashQuery>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const completedFields = [
    user.username,
    user.email,
    user.phoneNumber,
    user.age,
    user.gender,
    user.location,
  ].filter(Boolean).length;
  const completion = Math.round((completedFields / 6) * 100);
  const initials = user.username.slice(0, 2).toUpperCase();
  const memberSince = new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(user.createdAt));

  return (
    <main className="page-shell profile-page">
      <section className="profile-hero" aria-labelledby="profile-title">
        <div className="profile-avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="profile-hero-copy">
          <p className="eyebrow">Personal health space</p>
          <h1 id="profile-title">Welcome, {user.username}</h1>
          <p>{user.email}</p>
          <div className="profile-badges">
            <span>{user.isAdmin ? "Administrator" : "Member"}</span>
            <span>Joined {memberSince}</span>
            <span>{user.location ? "Care location saved" : "Location optional"}</span>
          </div>
        </div>
        <div
          className="profile-completion"
          style={
            { "--profile-completion": `${completion * 3.6}deg` } as React.CSSProperties
          }
          aria-label={`${completion}% profile complete`}
        >
          <div>
            <strong>{completion}%</strong>
            <span>complete</span>
          </div>
        </div>
      </section>

      <FlashNotices {...query} />

      <div className="profile-layout">
        <div className="profile-main-column">
          <section className="card profile-details-card">
            <div className="profile-section-heading">
              <div>
                <p className="eyebrow">Account details</p>
                <h2>Personal information</h2>
              </div>
              <span>Used only for your private account</span>
            </div>

            <div className="profile-identity-grid">
              <div>
                <span>Username</span>
                <strong>{user.username}</strong>
                <small>Your account identity</small>
              </div>
              <div>
                <span>Email address</span>
                <strong>{user.email}</strong>
                <small>Used for password recovery</small>
              </div>
            </div>

            <form action="/api/profile" method="post" className="form-grid profile-form">
              <div className="field">
                <label htmlFor="phoneNumber">Phone number</label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  maxLength={20}
                  autoComplete="tel"
                  placeholder="Optional contact number"
                  defaultValue={user.phoneNumber}
                />
                <p className="field-help">Optional and not shared with nearby places.</p>
              </div>
              <div className="field">
                <label htmlFor="age">Age</label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  inputMode="numeric"
                  placeholder="Optional"
                  defaultValue={user.age ?? ""}
                />
                <p className="field-help">
                  Helps provide age-appropriate wellness context.
                </p>
              </div>
              <div className="field">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" defaultValue={user.gender}>
                  <option value="">Prefer not to say</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
                <p className="field-help">Optional profile context.</p>
              </div>
              <div className="field profile-readiness-field">
                <span>Current health context</span>
                <strong>
                  {user.age ? `${user.age} years` : "Age not provided"} ·{" "}
                  {displayGender(user.gender)}
                </strong>
                <small>You can update these values at any time.</small>
              </div>
              <div className="field field-wide profile-form-actions">
                <SubmitButton pendingText="Saving profile…">
                  Save personal information
                </SubmitButton>
                <span>Changes are saved to your local application records.</span>
              </div>
            </form>
          </section>

          <LocationManager initialLocation={user.location} />
        </div>

        <aside className="profile-side-column">
          <section className="card profile-overview-card">
            <p className="eyebrow">At a glance</p>
            <h2>Your profile overview</h2>
            <dl className="profile-overview-list">
              <div>
                <dt>Account</dt>
                <dd>{user.isAdmin ? "Administrator" : "Standard member"}</dd>
              </div>
              <div>
                <dt>Age context</dt>
                <dd>{user.age ? `${user.age} years` : "Not provided"}</dd>
              </div>
              <div>
                <dt>Saved location</dt>
                <dd>{user.location?.placeName || "Not shared"}</dd>
              </div>
              <div>
                <dt>Profile status</dt>
                <dd>{completion}% complete</dd>
              </div>
            </dl>
          </section>

          <section className="card profile-links-card">
            <p className="eyebrow">Your health tools</p>
            <h2>Continue your journey</h2>
            <nav aria-label="Profile health shortcuts">
              <Link href="/health-tracker">
                <span>Health tracker</span>
                <strong aria-hidden="true">→</strong>
              </Link>
              <Link href="/daily-health-reports">
                <span>Daily health reports</span>
                <strong aria-hidden="true">→</strong>
              </Link>
              <Link href="/nearby">
                <span>Nearby care finder</span>
                <strong aria-hidden="true">→</strong>
              </Link>
              <Link href="/reports">
                <span>External report analysis</span>
                <strong aria-hidden="true">→</strong>
              </Link>
            </nav>
          </section>

          <ChangePasswordDialog passwordMinLength={AUTH.passwordMinLength} />

          <section className="profile-privacy-note">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Your information stays private</strong>
              <p>
                Profile data supports your account experience and general wellness
                context. It is not a medical record or diagnosis.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
