import { APP_NAME, LOCATION } from "@/lib/constants";
import type { NearbyPlace } from "@/lib/types";

export async function reverseGeocode(latitude: number, longitude: number) {
  const endpoint =
    process.env.NOMINATIM_REVERSE_URL || "https://nominatim.openstreetmap.org/reverse";
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
    "accept-language": "en",
  }).toString();
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": `${APP_NAME.replaceAll(" ", "")}/2.0` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Reverse geocoding failed");
    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const address = data.address ?? {};
    const keys = [
      "village",
      "neighbourhood",
      "suburb",
      "quarter",
      "town",
      "city_district",
      "city",
      "municipality",
      "county",
    ];
    const placeName =
      keys
        .map((key) => address[key])
        .find((value) => value && !/\b(?:sector|zone)\s*\d+/i.test(value)) ??
      "Place name unavailable";
    return { placeName, fullAddress: data.display_name || "Address unavailable" };
  } catch {
    return { placeName: "Place name unavailable", fullAddress: "Address unavailable" };
  }
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const [a, b, c, d] = [lat1, lng1, lat2, lng2].map(radians);
  const value =
    Math.sin((c - a) / 2) ** 2 + Math.cos(a) * Math.cos(c) * Math.sin((d - b) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(value));
}

export async function findNearby(
  latitude: number,
  longitude: number,
  radiusKm: number = LOCATION.defaultRadiusKm,
) {
  const query = `[out:json][timeout:25];(
    nwr["amenity"~"^(hospital|clinic|pharmacy)$"](around:${radiusKm * 1000},${latitude},${longitude});
    nwr["healthcare"~"^(hospital|clinic|pharmacy)$"](around:${radiusKm * 1000},${latitude},${longitude});
    nwr["shop"="chemist"](around:${radiusKm * 1000},${latitude},${longitude});
  );out center 100;`;
  const endpoint =
    process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": `${APP_NAME.replaceAll(" ", "")}/2.0`,
    },
    body: new URLSearchParams({ data: query }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Nearby search is temporarily unavailable.");
  const data = (await response.json()) as {
    elements?: Array<{
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
      tags?: Record<string, string>;
    }>;
  };
  const places = (data.elements ?? [])
    .flatMap((element): NearbyPlace[] => {
      const tags = element.tags ?? {};
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      const category =
        tags.shop === "chemist" ||
        tags.amenity === "pharmacy" ||
        tags.healthcare === "pharmacy"
          ? "pharmacy"
          : tags.amenity === "hospital" || tags.healthcare === "hospital"
            ? "hospital"
            : tags.amenity === "clinic" || tags.healthcare === "clinic"
              ? "clinic"
              : undefined;
      if (!tags.name || lat === undefined || lng === undefined || !category) return [];
      const address =
        [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:suburb"],
          tags["addr:city"],
          tags["addr:postcode"],
        ]
          .filter(Boolean)
          .join(", ") || "Address not available";
      return [
        {
          name: tags.name,
          category,
          lat,
          lng,
          address,
          distanceKm: Math.round(distanceKm(latitude, longitude, lat, lng) * 10) / 10,
        },
      ];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const seen = new Set<string>();
  const counts = { hospital: 0, clinic: 0, pharmacy: 0 };
  return places.filter((place) => {
    if (
      place.category !== "hospital" &&
      place.category !== "clinic" &&
      place.category !== "pharmacy"
    )
      return false;
    const key = `${place.category}:${place.name.toLowerCase()}:${place.lat.toFixed(5)}:${place.lng.toFixed(5)}`;
    if (seen.has(key) || counts[place.category] >= LOCATION.maxResultsPerCategory) {
      return false;
    }
    seen.add(key);
    counts[place.category] += 1;
    return true;
  });
}
