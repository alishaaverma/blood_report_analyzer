"use client";

import { useCallback, useEffect, useState } from "react";
import type { LocationProfile, NearbyPlace } from "@/lib/types";

export function NearbyFinder({ initialLocation }: { initialLocation: LocationProfile | null }) {
  const [location, setLocation] = useState(initialLocation);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [status, setStatus] = useState(initialLocation ? "Searching near your saved location…" : "Share your location to find care and pharmacies within 10 km.");

  const search = useCallback(async (latitude: number, longitude: number) => {
    setStatus("Searching within 10 km…");
    try {
      const response = await fetch(`/api/location/nearby?lat=${latitude}&lng=${longitude}&radiusKm=10`);
      const data = await response.json() as { results?: NearbyPlace[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not find nearby places.");
      setPlaces(data.results ?? []);
      setStatus(`${data.results?.length ?? 0} nearby healthcare locations found.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not find nearby places."); }
  }, []);

  useEffect(() => {
    if (!initialLocation) return;
    const timer = window.setTimeout(() => void search(initialLocation.latitude, initialLocation.longitude), 0);
    return () => window.clearTimeout(timer);
  }, [initialLocation, search]);

  function useCurrentLocation() {
    if (!navigator.geolocation) { setStatus("Geolocation is not supported by this browser."); return; }
    setStatus("Getting your current location…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch("/api/location", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }) });
        const data = await response.json() as LocationProfile & { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not save location.");
        setLocation(data);
        await search(coords.latitude, coords.longitude);
      } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save location."); }
    }, () => setStatus("Location permission was denied or is unavailable."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  const pharmacies = places.filter((place) => place.category === "pharmacy");
  const care = places.filter((place) => place.category !== "pharmacy");
  return (
    <>
      <section className="card">
        <div className="section-actions"><div><p className="eyebrow">Your area</p><h2>Nearby care within 10 km</h2></div><button className="button button-secondary button-small" type="button" onClick={useCurrentLocation}>Use current location</button></div>
        {location && <div className="location-card"><span aria-hidden="true">●</span><div><strong>{location.placeName}</strong><p>{location.fullAddress}</p><a className="small" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`}>View on map ↗</a></div></div>}
        <p className="muted small" role="status">{status}</p>
        {!!care.length && <><h3>Hospitals, clinics & doctors</h3><PlaceGrid places={care} /></>}
        {!!pharmacies.length && <><h3>Pharmacies</h3><PlaceGrid places={pharmacies} /></>}
      </section>
    </>
  );
}

function PlaceGrid({ places }: { places: NearbyPlace[] }) {
  return <div className="place-grid">{places.map((place, index) => <article className="place" key={`${place.name}-${index}`}><span className="place-category">{place.category} · {place.distanceKm} km</span><strong>{place.name}</strong><p>{place.address}</p><a className="small" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`}>View on map ↗</a></article>)}</div>;
}
