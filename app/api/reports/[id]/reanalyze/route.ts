import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeLines, extractPdfText, parseTestLines } from "@/lib/analysis";
import { getCurrentUser } from "@/lib/auth";
import { formRedirect } from "@/lib/http";
import { readStore, updateStore } from "@/lib/store";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return formRedirect(request, "/login", { error: "Please sign in." });
  const { id } = await params;
  const data = await readStore();
  const report = data.reports.find((item) => item.id === id && item.userId === user.id);
  if (!report) return formRedirect(request, "/reports", { error: "Report not found." });

  let rawExtractedText = "";
  let results: Report["results"] = [];
  let parseError = "";
  try {
    const buffer = await readFile(path.join(process.cwd(), "storage", "reports", user.id, report.storedFileName));
    rawExtractedText = await extractPdfText(buffer);
    results = analyzeLines(parseTestLines(rawExtractedText));
    if (!results.length) parseError = "No recognizable test lines were detected. The PDF layout may not be supported or it may be an image-only scan.";
  } catch (error) {
    console.error("PDF reanalysis failed:", error);
    parseError = "Could not read this PDF. The file may be damaged, password-protected, or an unsupported image-only scan.";
  }

  await updateStore((currentData) => {
    const currentReport = currentData.reports.find((item) => item.id === id && item.userId === user.id);
    if (!currentReport) return;
    currentReport.rawExtractedText = rawExtractedText;
    currentReport.results = results;
    currentReport.parseError = parseError;
    currentReport.status = results.length ? (results.some((result) => result.isAbnormal) ? "abnormal" : "normal") : "pending";
    currentReport.analyzedAt = results.length ? new Date().toISOString() : null;
  });

  return formRedirect(request, `/reports/${id}`, {
    ...(parseError ? { error: "Analysis still could not recognize this PDF." } : { success: "Report analyzed successfully." }),
  });
}
