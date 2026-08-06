import { rm } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { formRedirect } from "@/lib/http";
import { updateStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return formRedirect(request, "/reports", { error: "Administrator access required." });
  const { id } = await params;
  if (id === admin.id) return formRedirect(request, `/admin/users/${id}`, { error: "You cannot delete your own admin account." });
  const deleted = await updateStore((data) => {
    const index = data.users.findIndex((user) => user.id === id);
    if (index < 0) return false;
    data.users.splice(index, 1);
    data.reports = data.reports.filter((report) => report.userId !== id);
    data.passwordResets = data.passwordResets.filter((reset) => reset.userId !== id);
    return true;
  });
  if (!deleted) return formRedirect(request, "/admin/users", { error: "User not found." });
  try { await rm(path.join(process.cwd(), "storage", "reports", id), { recursive: true, force: true }); } catch { /* Files were already absent. */ }
  return formRedirect(request, "/admin", { success: "User and their reports were deleted." });
}
