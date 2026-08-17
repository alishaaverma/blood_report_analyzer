import { DailyHealthReports } from "@/components/daily-health-reports";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Daily health reports" };

export default async function DailyHealthReportsPage() {
  await requireUser();
  return (
    <main className="page-shell daily-health-reports-page">
      <DailyHealthReports />
    </main>
  );
}
