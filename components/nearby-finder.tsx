"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserCoordinates, saveLocation } from "@/lib/browser-location";
import { LOCATION } from "@/lib/constants";
import type { LocationProfile, NearbyPlace } from "@/lib/types";

type NearbyResponse = {
  results?: NearbyPlace[];
  hospitals?: NearbyPlace[];
  clinics?: NearbyPlace[];
  pharmacies?: NearbyPlace[];
  error?: string;
};

export function NearbyFinder({
  initialLocation,
}: {
  initialLocation: LocationProfile | null;
}) {
  const [location, setLocation] = useState(initialLocation);
  const [hospitals, setHospitals] = useState<NearbyPlace[]>([]);
  const [clinics, setClinics] = useState<NearbyPlace[]>([]);
  const [pharmacies, setPharmacies] = useState<NearbyPlace[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    initialLocation
      ? "Searching near your saved location…"
      : "Share your location to find nearby hospitals, clinics, and medicine pharmacies.",
  );

  const search = useCallback(async (latitude: number, longitude: number) => {
    setBusy(true);
    setStatus(`Searching within ${LOCATION.defaultRadiusKm} km…`);
    try {
      const response = await fetch(
        `/api/location/nearby?lat=${latitude}&lng=${longitude}&radiusKm=${LOCATION.defaultRadiusKm}`,
      );
      const data = (await response.json()) as NearbyResponse;
      if (!response.ok) throw new Error(data.error || "Could not find nearby places.");

      const allResults = data.results ?? [];
      const nextHospitals =
        data.hospitals ?? allResults.filter((place) => place.category === "hospital");
      const nextClinics =
        data.clinics ?? allResults.filter((place) => place.category === "clinic");
      const nextPharmacies =
        data.pharmacies ?? allResults.filter((place) => place.category === "pharmacy");
      setHospitals(nextHospitals);
      setClinics(nextClinics);
      setPharmacies(nextPharmacies);
      setStatus(
        `Found ${nextHospitals.length} ${pluralize("hospital", nextHospitals.length)}, ${nextClinics.length} ${pluralize("clinic", nextClinics.length)}, and ${nextPharmacies.length} ${pluralize("pharmacy", nextPharmacies.length)}.`,
      );
    } catch (error) {
      setHospitals([]);
      setClinics([]);
      setPharmacies([]);
      setStatus(error instanceof Error ? error.message : "Could not find nearby places.");
    } finally {
      setHasSearched(true);
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLocation) return;
    const timer = window.setTimeout(
      () => void search(initialLocation.latitude, initialLocation.longitude),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [initialLocation, search]);

  async function useCurrentLocation() {
    setBusy(true);
    setStatus("Getting your current location…");
    try {
      const coordinates = await getBrowserCoordinates();
      const savedLocation = await saveLocation(
        coordinates.latitude,
        coordinates.longitude,
      );
      setLocation(savedLocation);
      await search(coordinates.latitude, coordinates.longitude);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save location.");
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="section-actions">
        <div>
          <p className="eyebrow">Nearest locations</p>
          <h2>Hospitals, clinics, and medicine pharmacies</h2>
        </div>
        <button
          className="button button-secondary button-small"
          type="button"
          disabled={busy}
          onClick={useCurrentLocation}
        >
          {busy ? "Searching…" : "Use current location"}
        </button>
      </div>

      {location && (
        <div className="location-card">
          <span aria-hidden="true">●</span>
          <div>
            <strong>{location.placeName}</strong>
            <p>{location.fullAddress}</p>
            <a
              className="small"
              target="_blank"
              rel="noreferrer"
              href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`}
            >
              View your location on map ↗
            </a>
          </div>
        </div>
      )}

      <p className="muted small" role="status">
        {status}
      </p>

      <div className="nearby-columns">
        <PlaceList
          title="Nearest hospitals"
          description="Hospitals ordered from nearest to farthest."
          places={hospitals}
          emptyMessage={
            hasSearched
              ? `No hospitals were found within ${LOCATION.defaultRadiusKm} km.`
              : "Share your location to load nearby hospitals."
          }
          origin={location}
        />
        <PlaceList
          title="Nearest clinics"
          description="Local clinics ordered from nearest to farthest."
          places={clinics}
          emptyMessage={
            hasSearched
              ? `No clinics were found within ${LOCATION.defaultRadiusKm} km.`
              : "Share your location to load nearby clinics."
          }
          origin={location}
        />
        <PlaceList
          title="Nearest pharmacies"
          description="Nearby pharmacies where you can ask about or buy medicines."
          places={pharmacies}
          emptyMessage={
            hasSearched
              ? `No pharmacies were found within ${LOCATION.defaultRadiusKm} km.`
              : "Share your location to load nearby pharmacies."
          }
          origin={location}
        />
      </div>
    </section>
  );
}

function pluralize(word: "hospital" | "clinic" | "pharmacy", count: number) {
  if (count === 1) return word;
  return word === "pharmacy" ? "pharmacies" : `${word}s`;
}

function PlaceList({
  title,
  description,
  places,
  emptyMessage,
  origin,
}: {
  title: string;
  description: string;
  places: NearbyPlace[];
  emptyMessage: string;
  origin: LocationProfile | null;
}) {
  return (
    <section className="nearby-group" aria-label={title}>
      <div className="nearby-group-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="nearby-count">{places.length}</span>
      </div>

      {places.length ? (
        <ol className="nearby-list">
          {places.map((place, index) => (
            <li key={`${place.category}-${place.name}-${place.lat}-${place.lng}`}>
              <article className="place">
                <span className="place-category">
                  {index + 1}. {place.distanceKm} km away
                </span>
                <strong>{place.name}</strong>
                <p>{place.address}</p>
                <div className="place-links">
                  <a
                    className="small"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`}
                  >
                    View map ↗
                  </a>
                  {origin && (
                    <a
                      className="small"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.latitude}%2C${origin.longitude}%3B${place.lat}%2C${place.lng}`}
                    >
                      Directions ↗
                    </a>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <p className="nearby-empty">{emptyMessage}</p>
      )}
    </section>
  );
}
