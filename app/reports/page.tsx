import Image from "next/image";
import Link from "next/link";
import { Notice } from "@/components/notice";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";

export const metadata = { title: "My reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const data = await readStore();
  const reports = data.reports.filter((report) => report.userId === user.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return (
    <main className="page-shell">
      <div className="page-heading">
        <div><p className="eyebrow">Your health records</p><h1>My reports</h1><p>Review past uploads and their recognized results.</p></div>
        <Link href="/reports/upload" className="button">＋ Upload report</Link>
      </div>
      <Notice type="error">{query.error}</Notice><Notice type="success">{query.success}</Notice>
      {reports.length ? (
        <section className="report-list" aria-label="Uploaded reports">
          {reports.map((report) => (
            <article className="report-row" key={report.id}>
              <div className="report-row-main"><span className="report-icon">PDF</span><div><Link className="report-title" href={`/reports/${report.id}`}>{report.title || "Untitled report"}</Link><span className="muted small">Uploaded {formatDate(report.uploadedAt)}</span></div></div>
              <div className="report-row-actions"><StatusBadge status={report.status} /><Link className="button button-secondary button-small" href={`/reports/${report.id}`}>View report</Link></div>
            </article>
          ))}
        </section>
      ) : (
        <section className="card empty-state">
          <Image src="/images/report-empty.svg" alt="An empty report document ready for an upload" width={520} height={320} loading="eager" />
          <h2>No reports yet</h2><p>Your analyzed reports will appear here. Upload a text-based lab PDF to get started.</p>
          <Link href="/reports/upload" className="button">Upload your first report</Link>
        </section>
      )}
    </main>
  );
}
