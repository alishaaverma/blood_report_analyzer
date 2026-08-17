"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import type { ReportStatus } from "@/lib/types";

interface ExternalReportSummary {
  id: string;
  title: string;
  originalFileName: string;
  status: ReportStatus;
  uploadedAt: string;
}

export function ExternalReportsModal() {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<ExternalReportSummary[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function openReports() {
    setOpen(true);
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports", { cache: "no-store" });
      const result = (await response.json()) as {
        reports?: ExternalReportSummary[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Could not load reports.");
      setReports(result.reports ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }

  const dialog = open ? (
    <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <section
        className="modal-panel external-reports-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="external-reports-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head external-reports-modal-head">
          <div>
            <p className="eyebrow">Your health records</p>
            <h2 id="external-reports-title">External report analysis</h2>
            <p className="muted">
              Review uploaded external lab reports and their recognized results.
            </p>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Close external reports"
            autoFocus
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="external-reports-modal-actions">
          <Link className="button" href="/reports/upload" onClick={() => setOpen(false)}>
            ＋ Upload report
          </Link>
        </div>

        {loading ? (
          <div className="notice notice-info" role="status">
            Loading external reports…
          </div>
        ) : message ? (
          <div className="notice notice-error" role="alert">
            {message}
          </div>
        ) : reports.length ? (
          <div className="report-list" aria-label="Uploaded external reports">
            {reports.map((report) => (
              <article className="report-row" key={report.id}>
                <div className="report-row-main">
                  <span className="report-icon">PDF</span>
                  <div>
                    <Link
                      className="report-title"
                      href={`/reports/${report.id}`}
                      onClick={() => setOpen(false)}
                    >
                      {report.title || "Untitled report"}
                    </Link>
                    <span className="muted small">
                      Uploaded {formatDate(report.uploadedAt)}
                    </span>
                  </div>
                </div>
                <div className="report-row-actions">
                  <StatusBadge status={report.status} />
                  <Link
                    className="button button-secondary button-small"
                    href={`/reports/${report.id}`}
                    onClick={() => setOpen(false)}
                  >
                    View report
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="external-reports-modal-empty">
            <strong>No external reports yet</strong>
            <p>Upload a supported lab-report PDF to begin an analysis.</p>
          </div>
        )}
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        className="nav-modal-trigger nav-primary-link"
        type="button"
        onClick={() => void openReports()}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        External report analysis
      </button>
      {dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
