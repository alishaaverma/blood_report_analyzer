import { HealthTracker } from "@/components/health-tracker";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Health tracker" };

export default async function HealthTrackerPage() {
  await requireUser();
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Daily wellness"
        title="Health tracker"
        description="Record steps, water, and meals; review seven-day charts; and configure meal and hydration reminders."
      />
      <HealthTracker />
    </main>
  );
}
