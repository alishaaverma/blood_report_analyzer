import { getCurrentUser } from "@/lib/auth";
import { reverseGeocode } from "@/lib/location";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { latitude?: number; longitude?: number };
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return Response.json({ error: "Invalid coordinates." }, { status: 400 });
  const address = await reverseGeocode(latitude, longitude);
  const location = { latitude, longitude, ...address, updatedAt: new Date().toISOString() };
  await updateStore((data) => { const user = data.users.find((item) => item.id === current.id); if (user) user.location = location; });
  return Response.json(location);
}
