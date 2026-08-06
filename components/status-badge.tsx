import type { ReportStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ReportStatus }) {
  const label = status === "normal" ? "All normal" : status === "abnormal" ? "Needs attention" : "Pending";
  return <span className={`status status-${status}`}><span aria-hidden="true" />{label}</span>;
}
