"use client";

import { useState } from "react";
import { getBrowserCoordinates, saveLocation } from "@/lib/browser-location";
import type { LocationProfile } from "@/lib/types";

export function LocationManager({
  initialLocation,
}: {
  initialLocation: LocationProfile | null;
}) {
  const [location, setLocation] = useState(initialLocation);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function update() {
    setBusy(true);
    setStatus("Getting your current location…");
    try {
      const coordinates = await getBrowserCoordinates();
      setLocation(await saveLocation(coordinates.latitude, coordinates.longitude));
      setStatus("Current location saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save location.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card profile-location-card">
      <div className="profile-section-heading">
        <div>
          <p className="eyebrow">Care location</p>
          <h2>Nearby-care starting point</h2>
        </div>
        <span>Shared only when you choose</span>
      </div>
      <p className="muted small">
        Your saved location helps sort hospitals, clinics, doctors, and pharmacies by
        distance.
      </p>
      {location ? (
        <div className="location-card">
          <span aria-hidden="true">●</span>
          <div>
            <strong>{location.placeName}</strong>
            <p>{location.fullAddress}</p>
            <a
              className="small"
              href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              View on map ↗
            </a>
          </div>
        </div>
      ) : (
        <p className="muted">
          No location is saved. It is only requested when you choose to share it.
        </p>
      )}
      <button
        className="button button-secondary"
        disabled={busy}
        type="button"
        onClick={update}
      >
        {busy ? "Getting location…" : "Share my current location"}
      </button>
      {status && (
        <p className="small muted" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
