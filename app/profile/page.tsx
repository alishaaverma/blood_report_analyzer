import { LocationManager } from "@/components/location-manager";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "My profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  return <main className="page-shell"><div className="page-heading"><div><p className="eyebrow">Personal details</p><h1>My profile</h1><p>Age helps tailor safety context around general guidance.</p></div></div><Notice type="error">{query.error}</Notice><Notice type="success">{query.success}</Notice>
    <section className="card medium"><h2>Account information</h2><p><strong>Username:</strong> {user.username}</p><p><strong>Email:</strong> {user.email}</p><form action="/api/profile" method="post" className="form-grid"><div className="field"><label htmlFor="phoneNumber">Phone number</label><input id="phoneNumber" name="phoneNumber" type="tel" defaultValue={user.phoneNumber} /></div><div className="field"><label htmlFor="age">Age</label><input id="age" name="age" type="number" min="1" max="120" defaultValue={user.age ?? ""} /></div><div className="field"><label htmlFor="gender">Gender</label><select id="gender" name="gender" defaultValue={user.gender}><option value="">Prefer not to say</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div><div className="field field-wide"><SubmitButton pendingText="Saving…">Save profile</SubmitButton></div></form></section>
    <LocationManager initialLocation={user.location} />
    <section className="card medium"><p className="eyebrow">Security</p><h2>Change password</h2><form action="/api/profile/password" method="post"><div className="field"><label htmlFor="currentPassword">Current password</label><input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></div><div className="field"><label htmlFor="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" minLength={10} autoComplete="new-password" required /></div><SubmitButton pendingText="Changing password…" className="button button-secondary">Change password</SubmitButton></form></section>
  </main>;
}
