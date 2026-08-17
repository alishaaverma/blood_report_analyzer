import { getCurrentUser } from "@/lib/auth";
import { formRedirect } from "@/lib/http";
import { reanalyzeReport } from "@/lib/report-service";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return formRedirect(request, "/login", { error: "Please sign in." });
  const { id } = await params;
  const data = await readStore();
  const report = data.reports.find((item) => item.id === id && item.userId === user.id);
  if (!report) return formRedirect(request, "/reports", { error: "Report not found." });

  try {
    const updated = await reanalyzeReport(report);
    return formRedirect(request, `/reports/${id}`, {
      ...(updated?.parseError
        ? { error: "Analysis still could not recognize this PDF." }
        : { success: "Report analyzed successfully." }),
    });
  } catch (error) {
    console.error("Could not reanalyze stored report:", error);
    return formRedirect(request, `/reports/${id}`, {
      error: "The stored PDF could not be opened. Upload the original file again.",
    });
  }
}
