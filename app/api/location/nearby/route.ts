import { getCurrentUser } from "@/lib/auth";
import { LOCATION } from "@/lib/constants";
import { findNearby } from "@/lib/location";
import { isValidCoordinates } from "@/lib/validation";

export async function GET(request: Request) {
  if (!(await getCurrentUser()))
    return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  const radiusKm = Number(url.searchParams.get("radiusKm") || LOCATION.defaultRadiusKm);
  if (!isValidCoordinates(latitude, longitude))
    return Response.json({ error: "Invalid coordinates." }, { status: 400 });
  if (radiusKm < LOCATION.minRadiusKm || radiusKm > LOCATION.maxRadiusKm)
    return Response.json(
      {
        error: `Radius must be between ${LOCATION.minRadiusKm} and ${LOCATION.maxRadiusKm} km.`,
      },
      { status: 400 },
    );
  try {
    const results = await findNearby(latitude, longitude, radiusKm);
    return Response.json({
      results,
      hospitals: results.filter((place) => place.category === "hospital"),
      clinics: results.filter((place) => place.category === "clinic"),
      pharmacies: results.filter((place) => place.category === "pharmacy"),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Nearby search is unavailable." },
      { status: 502 },
    );
  }
}
