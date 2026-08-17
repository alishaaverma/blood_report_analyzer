import { NearbyFinder } from "@/components/nearby-finder";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Find nearby care" };

export default async function NearbyPage() {
  const user = await requireUser();

  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Local healthcare"
        title="Find nearby care"
        description="Use your saved or current location to find hospitals, clinics, and pharmacies ordered by distance."
      />
      <NearbyFinder initialLocation={user.location} />
      <div className="disclaimer">
        Map listings can be incomplete or outdated. Call the facility before travelling,
        and contact local emergency services for urgent medical help.
      </div>
    </main>
  );
}
