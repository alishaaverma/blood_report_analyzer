import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";

export default async function AdminUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const admin = await requireAdmin(); const { id } = await params; const query = await searchParams; const data = await readStore(); const user = data.users.find((item) => item.id === id); if (!user) notFound(); const reports = data.reports.filter((report) => report.userId === user.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return <main className="page-shell"><Link className="small" href="/admin/users">← All users</Link><Notice type="error">{query.error}</Notice><Notice type="success">{query.success}</Notice><section className="card" style={{ marginTop: 18 }}><div className="report-header"><div><p className="eyebrow">User account</p><h1>{user.username}</h1><p>{user.email}</p><p className="muted small">Phone: {user.phoneNumber || "—"} · Age: {user.age ?? "—"} · Joined {formatDate(user.createdAt)}</p></div>{admin.id !== user.id && <form action={`/api/admin/users/${user.id}/delete`} method="post"><button className="button button-danger" type="submit">Delete user</button></form>}</div></section><section className="card"><h2>Reports ({reports.length})</h2><div className="table-wrap"><table className="result-table"><thead><tr><th>Title</th><th>Status</th><th>Uploaded</th><th /></tr></thead><tbody>{reports.length ? reports.map((report) => <tr key={report.id}><td>{report.title || "Untitled"}</td><td><StatusBadge status={report.status} /></td><td>{formatDate(report.uploadedAt)}</td><td><form action={`/api/reports/${report.id}/delete`} method="post"><button className="button-text" type="submit">Delete</button></form></td></tr>) : <tr><td colSpan={4}>No reports uploaded.</td></tr>}</tbody></table></div></section></main>;
}
