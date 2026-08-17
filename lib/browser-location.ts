import type { LocationProfile } from "@/lib/types";

export function getBrowserCoordinates(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error("Location permission was denied or is unavailable.")),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}

export async function saveLocation(latitude: number, longitude: number) {
  const response = await fetch("/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  const data = (await response.json()) as LocationProfile & { error?: string };
  if (!response.ok) throw new Error(data.error || "Could not save location.");
  return data;
}
