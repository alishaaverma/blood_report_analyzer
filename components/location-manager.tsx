"use client";

import { useState } from "react";
import type { LocationProfile } from "@/lib/types";

export function LocationManager({ initialLocation }: { initialLocation: LocationProfile | null }) {
  const [location, setLocation] = useState(initialLocation);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  function update() {
    if (!navigator.geolocation) { setStatus("Geolocation is not supported by this browser."); return; }
    setBusy(true); setStatus("Getting your current location…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch("/api/location", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }) });
        const data = await response.json() as LocationProfile & { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not save location.");
        setLocation(data); setStatus("Current location saved.");
      } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save location."); }
      finally { setBusy(false); }
    }, () => { setStatus("Permission denied or location unavailable."); setBusy(false); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }
  return <section className="card"><p className="eyebrow">Location</p><h2>Current saved location</h2>{location ? <div className="location-card"><span aria-hidden="true">●</span><div><strong>{location.placeName}</strong><p>{location.fullAddress}</p><a className="small" href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`} target="_blank" rel="noreferrer">View on map ↗</a></div></div> : <p className="muted">No location is saved. It is only requested when you choose to share it.</p>}<button className="button button-secondary" disabled={busy} type="button" onClick={update}>{busy ? "Getting location…" : "Share my current location"}</button>{status && <p className="small muted" role="status">{status}</p>}</section>;
}
