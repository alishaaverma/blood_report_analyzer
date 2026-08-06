import { getCurrentUser } from "@/lib/auth";
import { findNearby } from "@/lib/location";

export async function GET(request: Request) {
  if (!await getCurrentUser()) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  const radiusKm = Number(url.searchParams.get("radiusKm") || 10);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return Response.json({ error: "Invalid coordinates." }, { status: 400 });
  if (radiusKm < 1 || radiusKm > 10) return Response.json({ error: "Radius must be between 1 and 10 km." }, { status: 400 });
  try { return Response.json({ results: await findNearby(latitude, longitude, radiusKm) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Nearby search is unavailable." }, { status: 502 }); }
}
