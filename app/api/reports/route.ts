import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { analyzeLines, extractPdfText, parseTestLines } from "@/lib/analysis";
import { getCurrentUser } from "@/lib/auth";
import { formRedirect, textField } from "@/lib/http";
import { updateStore } from "@/lib/store";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return formRedirect(request, "/login", { error: "Please sign in to upload a report." });
  const form = await request.formData();
  const title = textField(form, "title");
  const file = form.get("pdf");
  if (!(file instanceof File) || !file.size) return formRedirect(request, "/reports/upload", { error: "Choose a PDF file." });
  if (file.size > 10 * 1024 * 1024) return formRedirect(request, "/reports/upload", { error: "The PDF is larger than the 10 MB limit." });
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return formRedirect(request, "/reports/upload", { error: "Only PDF files are supported." });

  const id = randomUUID();
  const userDirectory = path.join(process.cwd(), "storage", "reports", user.id);
  const storedFileName = `${id}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(userDirectory, { recursive: true });
  await writeFile(path.join(userDirectory, storedFileName), buffer);

  let rawExtractedText = "";
  let results: Report["results"] = [];
  let parseError = "";
  try {
    rawExtractedText = await extractPdfText(buffer);
    results = analyzeLines(parseTestLines(rawExtractedText));
    if (!results.length) parseError = "No recognizable test lines were detected. The PDF layout may not be supported or it may be an image-only scan.";
  } catch (error) {
    console.error("PDF extraction failed:", error);
    parseError = "Could not read this PDF. The file may be damaged, password-protected, or an unsupported image-only scan.";
  }
  const status: Report["status"] = results.length ? (results.some((result) => result.isAbnormal) ? "abnormal" : "normal") : "pending";
  const now = new Date().toISOString();
  const report: Report = {
    id, userId: user.id, title, originalFileName: file.name, storedFileName,
    rawExtractedText, status, results, parseError, uploadedAt: now,
    analyzedAt: results.length ? now : null,
  };
  await updateStore((data) => { data.reports.push(report); });
  return formRedirect(request, `/reports/${id}`);
}
