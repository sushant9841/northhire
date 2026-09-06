import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker icon references its image files by a relative URL that breaks under
// any bundler (Vite included) unless explicitly re-pointed at the bundled asset URLs - this is
// the standard fix, done once at module load.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

/* Free, open-source map tiles via OpenStreetMap - no API key, no account. Renders a pin per job
   that has real geocoded coordinates (see server/geocode.js); jobs without coordinates (bulk CSV
   imports, which deliberately skip geocoding) just don't get a pin, same as they'd be excluded
   from a radius search. */
export function JobsMap({ jobs, onSelect, center }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current).setView([center?.lat ?? 56, center?.lng ?? -96], center ? 11 : 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    const pinned = jobs.filter(j => j.lat != null && j.lng != null);
    pinned.forEach(j => {
      const marker = L.marker([j.lat, j.lng]).addTo(layerRef.current);
      // A marker click opens the popup by default (Leaflet's own behavior) - it must NOT also
      // navigate on that same click, or the popup can never actually be read. The popup's own
      // "View job" link is a real element found and wired up only after Leaflet renders it (popup
      // content is opaque HTML to React, not JSX), triggered by Leaflet's popupopen event.
      marker.bindPopup(`<strong>${j.t}</strong><br/>${j.city}, ${j.prov}<br/><a href="#" data-view-job style="color:#2563eb;font-weight:600;">View job →</a>`);
      marker.on("popupopen", (e) => {
        const link = e.popup.getElement()?.querySelector("[data-view-job]");
        link?.addEventListener("click", (evt) => { evt.preventDefault(); onSelect?.(j); });
      });
    });
    if (pinned.length && !center) {
      mapRef.current.fitBounds(pinned.map(j => [j.lat, j.lng]), { padding: [30, 30], maxZoom: 11 });
    } else if (center) {
      mapRef.current.setView([center.lat, center.lng], 11);
    }
  }, [jobs, center]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%", borderRadius: 16 }}/>;
}
