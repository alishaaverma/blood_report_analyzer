"use client";

import { useEffect, useRef, useState } from "react";
import type { ConditionMapping, Report } from "@/lib/types";

interface Guidance {
  label: string;
  diet: string;
  activity: string;
  care: string;
}

export function ReportExplanation({
  report,
  mappings,
  guidance,
  general,
}: {
  report: Report;
  mappings: ConditionMapping[];
  guidance: Guidance;
  general: { dietAdvice: string; exerciseAdvice: string };
}) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button className="button" type="button" onClick={() => setOpen(true)}>
        Explain this report
      </button>
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="explanation-title"
          >
            <div className="modal-head">
              <div>
                <p className="eyebrow">Point-by-point guide</p>
                <h2 id="explanation-title">Explanation of the report</h2>
              </div>
              <button
                ref={closeButton}
                className="modal-close"
                type="button"
                aria-label="Close explanation"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            {report.status === "normal" ? (
              <>
                <div className="notice notice-success">
                  <strong>Everything recognized is within range.</strong>
                  <br />
                  Continue healthy routines and discuss results with your clinician in the
                  context of symptoms and history.
                </div>
                <section className="modal-section">
                  <h3>Guidance for {guidance.label}</h3>
                  <p>
                    <strong>Diet:</strong> {guidance.diet}
                  </p>
                  <p>
                    <strong>Activity:</strong> {guidance.activity}
                  </p>
                </section>
                <div className="two-column">
                  <section className="guidance-box">
                    <h3>Everyday diet</h3>
                    <p>{general.dietAdvice}</p>
                  </section>
                  <section className="guidance-box">
                    <h3>Everyday movement</h3>
                    <p>{general.exerciseAdvice}</p>
                  </section>
                </div>
              </>
            ) : mappings.length ? (
              mappings.map((mapping) => (
                <section
                  className="modal-section"
                  key={`${mapping.testName}-${mapping.direction}`}
                >
                  <span className="status status-abnormal">
                    <span />
                    {mapping.direction}
                  </span>
                  <h3>{mapping.conditionName}</h3>
                  <p>{mapping.description}</p>
                  <p>
                    <strong>Related result:</strong> {mapping.testName}
                  </p>
                  <div className="guidance-box">
                    <h3>Age-based safety: {guidance.label}</h3>
                    <p>
                      <strong>Diet:</strong> {guidance.diet}
                    </p>
                    <p>
                      <strong>Activity:</strong> {guidance.activity}
                    </p>
                    <p>
                      <strong>Follow-up:</strong> {guidance.care}
                    </p>
                  </div>
                  <div className="recommendation">
                    <strong>Best next step:</strong> Arrange a consultation with a{" "}
                    {mapping.consultSpecialty} to confirm the cause and decide whether
                    monitoring or treatment is needed.
                  </div>
                </section>
              ))
            ) : (
              <NoticeFallback />
            )}
            <div className="disclaimer">
              This explanation is general health information, not a diagnosis. An abnormal
              result does not confirm a disease by itself. Do not start, stop, or change
              medication without a qualified professional.
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function NoticeFallback() {
  return (
    <div className="notice notice-info">
      This report has an abnormal result, but there is no specific condition mapping for
      it. Ask a qualified doctor to interpret the finding.
    </div>
  );
}
