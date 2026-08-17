import { getCurrentUser } from "@/lib/auth";
import { formRedirect, textField } from "@/lib/http";
import { createReport, validatePdfFile } from "@/lib/report-service";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const data = await readStore();
  const reports = data.reports
    .filter((report) => report.userId === user.id)
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .map(({ id, title, originalFileName, status, uploadedAt }) => ({
      id,
      title,
      originalFileName,
      status,
      uploadedAt,
    }));

  return Response.json({ reports });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return formRedirect(request, "/login", {
      error: "Please sign in to upload a report.",
    });
  const form = await request.formData();
  const title = textField(form, "title");
  const file = form.get("pdf");
  if (!(file instanceof File) || !file.size)
    return formRedirect(request, "/reports/upload", { error: "Choose a PDF file." });
  const validationError = await validatePdfFile(file);
  if (validationError)
    return formRedirect(request, "/reports/upload", { error: validationError });

  try {
    const report = await createReport({ userId: user.id, title, file });
    return formRedirect(request, `/reports/${report.id}`);
  } catch (error) {
    console.error("Could not store uploaded report:", error);
    return formRedirect(request, "/reports/upload", {
      error: "The report could not be saved. Please try again.",
    });
  }
}
