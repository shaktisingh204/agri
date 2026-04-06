"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Region } from "../lib/types";

export function RegionMapClient({ regions }: { regions: Region[] }) {
  const center =
    regions.length > 0 &&
    typeof regions[0].latitude === "number" &&
    typeof regions[0].longitude === "number"
      ? ([regions[0].latitude, regions[0].longitude] as [number, number])
      : ([5.5, 20.0] as [number, number]);

  return (
    <MapContainer center={center} className="h-[360px] w-full" scrollWheelZoom={false} zoom={4}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
      />
      {regions
        .filter((region) => typeof region.latitude === "number" && typeof region.longitude === "number")
        .map((region) => (
          <Marker key={region.id} position={[region.latitude as number, region.longitude as number]}>
            <Popup>
              <strong>{region.name}</strong>
              <br />
              {region.agroZoneName}
              <br />
              {region.country.name}
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
