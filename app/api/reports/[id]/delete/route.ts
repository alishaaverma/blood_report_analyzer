import { getCurrentUser } from "@/lib/auth";
import { formRedirect } from "@/lib/http";
import { deleteReport } from "@/lib/report-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return formRedirect(request, "/login", { error: "Please sign in." });
  const { id } = await params;
  const removed = await deleteReport(id, user);
  if (!removed)
    return formRedirect(request, "/reports", {
      error: "Report not found or access denied.",
    });
  return formRedirect(
    request,
    user.isAdmin && removed.userId !== user.id
      ? `/admin/users/${removed.userId}`
      : "/reports",
    { success: "Report deleted." },
  );
}
