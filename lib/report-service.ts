import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeLines, parseTestLines } from "@/lib/analysis";
import { PDF_ERRORS, REPORTS } from "@/lib/constants";
import { extractPdfText } from "@/lib/pdf";
import { updateStore } from "@/lib/store";
import type { Report } from "@/lib/types";

interface AnalysisOutcome {
  rawExtractedText: string;
  results: Report["results"];
  parseError: string;
  status: Report["status"];
  analyzedAt: string | null;
}

const reportsRoot = path.join(process.cwd(), "storage", "reports");

function reportDirectory(userId: string) {
  return path.join(/* turbopackIgnore: true */ reportsRoot, userId);
}

export function reportFilePath(userId: string, storedFileName: string) {
  return path.join(/* turbopackIgnore: true */ reportDirectory(userId), storedFileName);
}

export async function validatePdfFile(file: File) {
  if (!file.size) return "Choose a PDF file.";
  if (file.size > REPORTS.maxUploadBytes) {
    return `The PDF is larger than the ${REPORTS.maxUploadLabel} limit.`;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are supported.";
  }

  const signature = Buffer.from(await file.slice(0, 5).arrayBuffer()).toString("ascii");
  return signature === "%PDF-" ? null : "The selected file is not a valid PDF.";
}

export async function analyzePdfBuffer(buffer: Buffer): Promise<AnalysisOutcome> {
  try {
    const rawExtractedText = await extractPdfText(buffer);
    const results = analyzeLines(parseTestLines(rawExtractedText));
    const parseError = results.length ? "" : PDF_ERRORS.noRecognizableLines;
    const status = results.length
      ? results.some((result) => result.isAbnormal)
        ? "abnormal"
        : "normal"
      : "pending";

    return {
      rawExtractedText,
      results,
      parseError,
      status,
      analyzedAt: results.length ? new Date().toISOString() : null,
    };
  } catch (error) {
    console.error("PDF extraction failed:", error);
    return {
      rawExtractedText: "",
      results: [],
      parseError: PDF_ERRORS.unreadable,
      status: "pending",
      analyzedAt: null,
    };
  }
}

export async function createReport({
  userId,
  title,
  file,
}: {
  userId: string;
  title: string;
  file: File;
}) {
  const id = randomUUID();
  const storedFileName = `${id}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(reportDirectory(userId), { recursive: true });
  await writeFile(reportFilePath(userId, storedFileName), buffer);

  const analysis = await analyzePdfBuffer(buffer);
  const report: Report = {
    id,
    userId,
    title,
    originalFileName: file.name,
    storedFileName,
    uploadedAt: new Date().toISOString(),
    ...analysis,
  };

  await updateStore((data) => {
    data.reports.push(report);
  });
  return report;
}

export async function reanalyzeReport(report: Report) {
  const buffer = await readFile(reportFilePath(report.userId, report.storedFileName));
  const analysis = await analyzePdfBuffer(buffer);

  const updated = await updateStore((data) => {
    const current = data.reports.find((item) => item.id === report.id);
    if (!current) return null;
    Object.assign(current, analysis);
    return current;
  });

  return updated;
}

export async function deleteReport(
  reportId: string,
  actor: { id: string; isAdmin: boolean },
) {
  const report = await updateStore((data) => {
    const index = data.reports.findIndex(
      (item) => item.id === reportId && (item.userId === actor.id || actor.isAdmin),
    );
    if (index < 0) return null;
    return data.reports.splice(index, 1)[0];
  });

  if (!report) return null;
  try {
    await unlink(reportFilePath(report.userId, report.storedFileName));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Could not delete report file:", error);
  }
  return report;
}
