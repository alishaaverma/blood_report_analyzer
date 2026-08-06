import { unlink } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { formRedirect } from "@/lib/http";
import { updateStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return formRedirect(request, "/login", { error: "Please sign in." });
  const { id } = await params;
  const removed = await updateStore((data) => {
    const index = data.reports.findIndex((report) => report.id === id && (report.userId === user.id || user.isAdmin));
    if (index < 0) return null;
    return data.reports.splice(index, 1)[0];
  });
  if (!removed) return formRedirect(request, "/reports", { error: "Report not found or access denied." });
  try { await unlink(path.join(process.cwd(), "storage", "reports", removed.userId, removed.storedFileName)); } catch { /* Already absent. */ }
  return formRedirect(request, user.isAdmin && removed.userId !== user.id ? `/admin/users/${removed.userId}` : "/reports", { success: "Report deleted." });
}
