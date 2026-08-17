"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DailyHealthReport } from "@/lib/health-report";

type ReportResponse = {
  reports: DailyHealthReport[];
  today: string;
  error?: string;
};

type TrendResult = {
  label: string;
  detail: string;
  difference: number | null;
  tone: "positive" | "steady" | "attention" | "neutral";
};

function localDateKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(value: string, includeYear = true) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(`${value}T00:00:00`));
}

function average(reports: DailyHealthReport[]) {
  return reports.reduce((total, report) => total + report.score, 0) / reports.length;
}

function analyzeTrend(reports: DailyHealthReport[]): TrendResult {
  const recorded = reports
    .filter((report) => report.trackedAreas > 0)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (recorded.length < 2) {
    return {
      label: "More records needed",
      detail: "Record tracker activity on at least two dates to calculate a trend.",
      difference: null,
      tone: "neutral",
    };
  }

  const windowSize = Math.min(3, Math.floor(recorded.length / 2));
  const recent = recorded.slice(-windowSize);
  const previous = recorded.slice(-windowSize * 2, -windowSize);
  const difference = Math.round(average(recent) - average(previous));
  if (difference >= 5) {
    return {
      label: "Improving consistency",
      detail: `Your recent average is ${difference} points higher than the previous comparable period.`,
      difference,
      tone: "positive",
    };
  }
  if (difference <= -5) {
    return {
      label: "Recent consistency is lower",
      detail: `Your recent average is ${Math.abs(difference)} points lower. Review which habits became harder to complete.`,
      difference,
      tone: "attention",
    };
  }
  return {
    label: "Consistency is steady",
    detail: "Your recent average is close to the previous comparable period.",
    difference,
    tone: "steady",
  };
}

export function DailyHealthReports() {
  const [reports, setReports] = useState<DailyHealthReport[]>([]);
  const [today] = useState(localDateKey);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [message, setMessage] = useState("Loading daily health reports…");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const createResponse = await fetch("/api/health-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
        signal: controller.signal,
      });
      const createResult = (await createResponse.json()) as { error?: string };
      if (!createResponse.ok) {
        throw new Error(createResult.error || "Could not create today’s report.");
      }
      const response = await fetch(`/api/health-reports?today=${today}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const result = (await response.json()) as ReportResponse;
      if (!response.ok) throw new Error(result.error || "Could not load reports.");
      setReports(result.reports);
      setSelectedDate(result.today);
      setSearchDate(result.today);
      setMessage("");
    })().catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Could not load reports.");
    });
    return () => controller.abort();
  }, [today]);

  const selectedReport =
    reports.find((report) => report.date === selectedDate) ?? reports[0] ?? null;
  const chartReports = useMemo(
    () =>
      reports
        .filter((report) => report.trackedAreas > 0)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-14),
    [reports],
  );
  const trend = useMemo(() => analyzeTrend(reports), [reports]);
  const savedReports = reports;

  function findReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const report = reports.find((item) => item.date === searchDate);
    if (!report) {
      setMessage(`No saved tracker report was found for ${formatDate(searchDate)}.`);
      return;
    }
    setSelectedDate(report.date);
    setMessage("");
  }

  return (
    <section className="home-health-report" aria-labelledby="daily-report-title">
      <div className="section-actions">
        <div>
          <p className="eyebrow">Daily health reports</p>
          <h2 id="daily-report-title">Your health-tracker progress</h2>
          <p className="muted">
            Each report summarizes the tracker entries saved for that date.
          </p>
        </div>
        <Link className="button button-small" href="/health-tracker">
          Update health tracker
        </Link>
      </div>

      <div className="card daily-health-report-card">
        <form className="health-report-search" onSubmit={findReport}>
          <div className="field">
            <label htmlFor="healthReportDate">Find a daily report</label>
            <input
              id="healthReportDate"
              type="date"
              max={today}
              value={searchDate}
              onChange={(event) => setSearchDate(event.target.value)}
              required
            />
          </div>
          <button className="button button-secondary" type="submit">
            Search report
          </button>
          {selectedDate !== today && (
            <button
              className="button-text"
              type="button"
              onClick={() => {
                setSelectedDate(today);
                setSearchDate(today);
                setMessage("");
              }}
            >
              Show today
            </button>
          )}
        </form>

        {message && (
          <div className="notice notice-info" role="status">
            {message}
          </div>
        )}

        {selectedReport && (
          <>
            <div className="daily-report-heading">
              <div>
                <span>{formatDate(selectedReport.date)}</span>
                <strong>{selectedReport.result}</strong>
                <p>{selectedReport.summary}</p>
              </div>
              <div className="daily-report-score" aria-label="Daily consistency score">
                <strong>{selectedReport.score}</strong>
                <span>/100</span>
              </div>
            </div>

            <div className="daily-report-metrics">
              {selectedReport.metrics.map((metric) => (
                <div key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{metric.displayValue}</strong>
                  <div className="tracker-progress">
                    <span style={{ width: `${metric.percentage}%` }} />
                  </div>
                  <small>{metric.displayGoal}</small>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="health-report-analysis">
          <div>
            <h3>Daily consistency graph</h3>
            <HealthTrendGraph reports={chartReports} selectedDate={selectedDate} />
          </div>
          <aside className={`health-trend-result health-trend-${trend.tone}`}>
            <span>Result from recent reports</span>
            <strong>{trend.label}</strong>
            <p>{trend.detail}</p>
            {trend.difference !== null && (
              <small>
                Trend difference: {trend.difference > 0 ? "+" : ""}
                {trend.difference} points
              </small>
            )}
          </aside>
        </div>

        {selectedReport && (
          <div className="health-report-suggestions">
            <h3>Suggestions for {formatDate(selectedReport.date, false)}</h3>
            <ul>
              {selectedReport.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="health-report-history">
          <h3>Saved daily reports</h3>
          {savedReports.length ? (
            <div>
              {savedReports.slice(0, 10).map((report) => (
                <button
                  type="button"
                  className={report.date === selectedDate ? "active" : ""}
                  aria-pressed={report.date === selectedDate}
                  key={report.date}
                  onClick={() => {
                    setSelectedDate(report.date);
                    setSearchDate(report.date);
                    setMessage("");
                  }}
                >
                  <span>{formatDate(report.date)}</span>
                  <strong>{report.score}/100</strong>
                  <small>{report.result}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">
              No saved reports yet. Add entries in the health tracker to create today’s
              report.
            </p>
          )}
        </div>

        <div className="disclaimer">
          This score measures completion of your selected wellness goals and logged
          habits; it does not measure disease, fitness, or overall health and cannot
          diagnose a condition. Missing entries lower the score. Seek medical care for
          symptoms or concerns regardless of the graph result.
        </div>
      </div>
    </section>
  );
}

function HealthTrendGraph({
  reports,
  selectedDate,
}: {
  reports: DailyHealthReport[];
  selectedDate: string;
}) {
  if (!reports.length) {
    return (
      <div className="health-graph-empty">
        Record tracker activity to begin your improvement graph.
      </div>
    );
  }

  const width = 720;
  const height = 250;
  const left = 42;
  const right = 20;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = reports.map((report, index) => ({
    report,
    x:
      reports.length === 1
        ? left + plotWidth / 2
        : left + (index / (reports.length - 1)) * plotWidth,
    y: top + plotHeight - (report.score / 100) * plotHeight,
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="health-trend-graph">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Daily consistency scores from ${formatDate(reports[0].date)} to ${formatDate(reports[reports.length - 1].date)}`}
      >
        {[0, 25, 50, 75, 100].map((value) => {
          const y = top + plotHeight - (value / 100) * plotHeight;
          return (
            <g key={value}>
              <line
                className="health-graph-grid"
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
              />
              <text className="health-graph-axis" x={left - 9} y={y + 4} textAnchor="end">
                {value}
              </text>
            </g>
          );
        })}
        {points.length > 1 && <path className="health-graph-line" d={path} />}
        {points.map((point, index) => {
          const showLabel =
            points.length <= 7 ||
            index === 0 ||
            index === points.length - 1 ||
            index % 2 === 0;
          return (
            <g key={point.report.date}>
              <circle
                className={
                  point.report.date === selectedDate
                    ? "health-graph-point health-graph-point-selected"
                    : "health-graph-point"
                }
                cx={point.x}
                cy={point.y}
                r={point.report.date === selectedDate ? 6 : 4}
              >
                <title>
                  {formatDate(point.report.date)}: {point.report.score}/100
                </title>
              </circle>
              {showLabel && (
                <text
                  className="health-graph-axis"
                  x={point.x}
                  y={height - 14}
                  textAnchor="middle"
                >
                  {formatDate(point.report.date, false)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
