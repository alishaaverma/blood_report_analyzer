import Link from "next/link";
import { notFound } from "next/navigation";
import { ConditionGuidanceCard } from "@/components/condition-guidance-card";
import { FlashNotices, type FlashQuery } from "@/components/flash-notices";
import { MedicineOptions, NormalSupplementGuidance } from "@/components/medicine-options";
import { NearbyFinder } from "@/components/nearby-finder";
import { ReportExplanation } from "@/components/report-explanation";
import { ReportResultsTable } from "@/components/report-results-table";
import { StatusBadge } from "@/components/status-badge";
import { ageGuidance, mappingsForReport } from "@/lib/analysis";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { generalRecommendation } from "@/lib/seed";
import { readStore } from "@/lib/store";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashQuery>;
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
      <Link className="small" href="/reports">
        ← Back to reports
      </Link>
      <div className="spaced-notices">
        <FlashNotices {...query} />
      </div>
      <section className="card">
        <div className="report-header">
          <div>
            <p className="eyebrow">Lab report</p>
            <h1>{report.title || "Untitled report"}</h1>
            <p className="muted">
              Uploaded {formatDate(report.uploadedAt)} · {report.originalFileName}
            </p>
            <StatusBadge status={report.status} />
          </div>
          <div className="report-actions">
            {report.status !== "pending" && (
              <ReportExplanation
                report={report}
                mappings={mappings}
                guidance={guidance}
                general={generalRecommendation}
              />
            )}
            {report.parseError && (
              <form action={`/api/reports/${report.id}/reanalyze`} method="post">
                <button className="button button-secondary" type="submit">
                  Retry analysis
                </button>
              </form>
            )}
            <form action={`/api/reports/${report.id}/delete`} method="post">
              <button className="button button-danger" type="submit">
                Delete
              </button>
            </form>
          </div>
        </div>
        {report.parseError && (
          <div className="notice notice-error notice-in-card">{report.parseError}</div>
        )}
        {report.status === "normal" && (
          <div className="notice notice-success notice-in-card">
            All recognized parameters are within their reference ranges.
          </div>
        )}
        {report.status === "abnormal" && (
          <div className="notice notice-error notice-in-card">
            Some recognized parameters are outside their reference ranges. Review the
            details below.
          </div>
        )}
      </section>

      <ReportResultsTable results={report.results} />

      {report.status === "normal" && (
        <section className="card">
          <p className="eyebrow">Keep it going</p>
          <h2>Everyday recommendations</h2>
          <div className="two-column">
            <div className="guidance-box">
              <h3>Balanced nutrition</h3>
              <p>{generalRecommendation.dietAdvice}</p>
            </div>
            <div className="guidance-box">
              <h3>Regular movement</h3>
              <p>{generalRecommendation.exerciseAdvice}</p>
            </div>
          </div>
          <NormalSupplementGuidance />
        </section>
      )}

      {report.status === "abnormal" &&
        mappings.map((mapping) => (
          <ConditionGuidanceCard
            mapping={mapping}
            key={`${mapping.testName}-${mapping.direction}`}
          />
        ))}

      {report.status === "abnormal" && <MedicineOptions medicines={medicines} />}

      {report.status === "abnormal" && <NearbyFinder initialLocation={user.location} />}
      <div className="disclaimer">
        This automated report may contain extraction or matching errors and is not a
        medical diagnosis. Always have a qualified clinician interpret the original lab
        report.
      </div>
    </main>
  );
}
