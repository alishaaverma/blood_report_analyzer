import Link from "next/link";
import { Notice } from "@/components/notice";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";

export const metadata = { title: "Admin" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireAdmin(); const query = await searchParams; const data = await readStore();
  const recent = [...data.reports].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 10);
  return <main className="page-shell"><div className="page-heading"><div><p className="eyebrow">Administration</p><h1>Overview</h1><p>Manage accounts and uploaded reports.</p></div><Link className="button" href="/admin/users">Manage users</Link></div><Notice type="error">{query.error}</Notice><Notice type="success">{query.success}</Notice>
    <section className="stat-grid"><div className="stat"><strong>{data.users.length}</strong><span>Total users</span></div><div className="stat"><strong>{data.reports.length}</strong><span>Total reports</span></div><div className="stat"><strong>{data.reports.filter((report) => report.status === "abnormal").length}</strong><span>Needs attention</span></div></section>
    <section className="card"><h2>Recent reports</h2><div className="table-wrap"><table className="result-table"><thead><tr><th>User</th><th>Report</th><th>Status</th><th>Uploaded</th></tr></thead><tbody>{recent.length ? recent.map((report) => { const owner = data.users.find((user) => user.id === report.userId); return <tr key={report.id}><td>{owner ? <Link href={`/admin/users/${owner.id}`}>{owner.username}</Link> : "Deleted user"}</td><td>{report.title || "Untitled"}</td><td><StatusBadge status={report.status} /></td><td>{formatDate(report.uploadedAt)}</td></tr>; }) : <tr><td colSpan={4}>No reports uploaded.</td></tr>}</tbody></table></div></section>
  </main>;
}
