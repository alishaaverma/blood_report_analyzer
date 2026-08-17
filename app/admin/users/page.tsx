import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";

export const metadata = { title: "Manage users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const data = await readStore();
  const search = query.q?.trim().toLowerCase() ?? "";
  const users = data.users
    .filter(
      (user) =>
        !search ||
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reportCounts = data.reports.reduce((counts, report) => {
    counts.set(report.userId, (counts.get(report.userId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  return (
    <main className="page-shell">
      <Link className="small" href="/admin">
        ← Admin overview
      </Link>
      <div className="spaced-heading">
        <PageHeading eyebrow="Accounts" title="All users" />
      </div>
      <section className="card">
        <form method="get">
          <div className="field">
            <label htmlFor="q">Search users</label>
            <input
              id="q"
              name="q"
              defaultValue={query.q}
              placeholder="Username or email"
            />
          </div>
        </form>
        <div className="table-wrap">
          <table className="result-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Reports</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.username}</strong>
                    {user.isAdmin && <span className="small muted"> · Admin</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>{reportCounts.get(user.id) ?? 0}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <Link
                      className="button button-small button-secondary"
                      href={`/admin/users/${user.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
