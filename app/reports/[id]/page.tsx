import Link from "next/link";
import { notFound } from "next/navigation";
import { NearbyFinder } from "@/components/nearby-finder";
import { Notice } from "@/components/notice";
import { ReportExplanation } from "@/components/report-explanation";
import { StatusBadge } from "@/components/status-badge";
import { ageGuidance, mappingsForReport } from "@/lib/analysis";
import { requireUser } from "@/lib/auth";
import { formatDate, onlineMedicineLinks } from "@/lib/format";
import { generalRecommendation } from "@/lib/seed";
import { readStore } from "@/lib/store";

export default async function ReportDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const data = await readStore();
  const report = data.reports.find((item) => item.id === id && item.userId === user.id);
  if (!report) notFound();
  const mappings = mappingsForReport(report);
  const guidance = ageGuidance(user.age);
  const medicines = [...new Set(mappings.flatMap((mapping) => mapping.medicines))];
  return (
    <main className="page-shell">
      <Link className="small" href="/reports">← Back to reports</Link>
      <div style={{ marginTop: 18 }}><Notice type="error">{query.error}</Notice><Notice type="success">{query.success}</Notice></div>
      <section className="card">
        <div className="report-header">
          <div><p className="eyebrow">Lab report</p><h1>{report.title || "Untitled report"}</h1><p className="muted">Uploaded {formatDate(report.uploadedAt)} · {report.originalFileName}</p><StatusBadge status={report.status} /></div>
          <div className="report-actions">
            {report.status !== "pending" && <ReportExplanation report={report} mappings={mappings} guidance={guidance} general={generalRecommendation} />}
            {report.parseError && <form action={`/api/reports/${report.id}/reanalyze`} method="post"><button className="button button-secondary" type="submit">Retry analysis</button></form>}
            <form action={`/api/reports/${report.id}/delete`} method="post"><button className="button button-danger" type="submit">Delete</button></form>
          </div>
        </div>
        {report.parseError && <div className="notice notice-error" style={{ marginTop: 20 }}>{report.parseError}</div>}
        {report.status === "normal" && <div className="notice notice-success" style={{ marginTop: 20 }}>All recognized parameters are within their reference ranges.</div>}
        {report.status === "abnormal" && <div className="notice notice-error" style={{ marginTop: 20 }}>Some recognized parameters are outside their reference ranges. Review the details below.</div>}
      </section>

      {!!report.results.length && <section className="card"><h2>Test results</h2><div className="table-wrap"><table className="result-table"><thead><tr><th>Test</th><th>Value</th><th>Reference range</th><th>Result</th></tr></thead><tbody>{report.results.map((result, index) => <tr className={result.isAbnormal ? "row-abnormal" : ""} key={`${result.testName}-${index}`}><td><strong>{result.testName}</strong></td><td>{result.value} {result.unit}</td><td>{result.normalMin !== null && result.normalMax !== null ? `${result.normalMin}–${result.normalMax} ${result.unit}` : "Not available"}</td><td><span className={`status status-${result.isAbnormal ? "abnormal" : "normal"}`}><span />{result.direction === "unknown" ? "Range unknown" : result.direction}</span></td></tr>)}</tbody></table></div></section>}

      {report.status === "normal" && <section className="card"><p className="eyebrow">Keep it going</p><h2>Everyday recommendations</h2><div className="two-column"><div className="guidance-box"><h3>Balanced nutrition</h3><p>{generalRecommendation.dietAdvice}</p></div><div className="guidance-box"><h3>Regular movement</h3><p>{generalRecommendation.exerciseAdvice}</p></div></div></section>}

      {report.status === "abnormal" && mappings.map((mapping) => <section className="card" key={`${mapping.testName}-${mapping.direction}`}><p className="eyebrow">Related to {mapping.testName} · {mapping.direction}</p><h2>{mapping.conditionName}</h2><p>{mapping.description}</p><div className="two-column"><div className="guidance-box"><h3>Diet guidance</h3><p>{mapping.dietAdvice}</p></div><div className="guidance-box"><h3>Activity guidance</h3><p>{mapping.exerciseAdvice}</p></div></div><div className="recommendation"><strong>Best recommendation:</strong> Consult a <strong>{mapping.consultSpecialty}</strong> to confirm the cause and receive an individual plan. {mapping.severityNote}</div>{!!mapping.medicines.length && <><h3>Medicines a doctor may consider</h3><p className="muted small">For discussion only—this is not a prescription.</p><ul className="medicine-list">{mapping.medicines.map((medicine) => <li key={medicine}>{medicine}</li>)}</ul></>}</section>)}

      {report.status === "abnormal" && !!medicines.length && <section className="card"><p className="eyebrow">Reference links</p><h2>Find medicine information</h2>{medicines.map((medicine) => <div key={medicine}><h3>{medicine}</h3><div className="medicine-links">{onlineMedicineLinks(medicine).map((store) => <a key={store.name} href={store.url} target="_blank" rel="noreferrer">Search {store.name} ↗</a>)}</div></div>)}<div className="disclaimer">Do not start, stop, combine, or change the dose of medicine based on these links. Ask a doctor or pharmacist about diagnosis, contraindications, interactions, and dosage.</div></section>}

      {report.status === "abnormal" && <NearbyFinder initialLocation={user.location} />}
      <div className="disclaimer">This automated report may contain extraction or matching errors and is not a medical diagnosis. Always have a qualified clinician interpret the original lab report.</div>
    </main>
  );
}
