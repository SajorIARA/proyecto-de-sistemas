/**
 * Mapa interactivo del destino (Leaflet + OpenStreetMap).
 *
 * Centra el mapa en la coordenada PostGIS que entrega el backend
 * (`Atractivo.ubicacion` → `{longitud, latitud}`) con un marcador
 * circular de marca. Sin dependencias de API keys.
 */

import { useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { Coordenada } from "../../../types/turismo";
import { formatearCoordenadas } from "../utils/formato";

interface MapaDestinoProps {
  ubicacion: Coordenada | null;
  nombreDestino: string;
}

const ZOOM = 15;

export function MapaDestino({ ubicacion, nombreDestino }: MapaDestinoProps) {
  const centro = useMemo<[number, number] | null>(
    () =>
      ubicacion ? [ubicacion.latitud, ubicacion.longitud] : null,
    [ubicacion],
  );

  return (
    <section
      aria-labelledby="mapa-destino"
      className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#5B3A29]/15 px-6 py-5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
            02 / Ubicación
          </p>

          <h3
            id="mapa-destino"
            className="font-display mt-2 text-xl font-black tracking-[-0.03em] text-[#233128]"
          >
            Cómo llegar
          </h3>
        </div>

        <span className="shrink-0 border border-[#2F4B3B]/25 bg-[#EDF2E9] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#304A38]">
          Mapa interactivo
        </span>
      </header>

      {centro ? (
        <div data-testid="mapa-interactivo">
          <MapContainer
            center={centro}
            zoom={ZOOM}
            scrollWheelZoom={false}
            className="z-0 h-[19rem] w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker
              center={centro}
              radius={10}
              pathOptions={{
                color: "#9A5B3C",
                weight: 3,
                fillColor: "#C6923B",
                fillOpacity: 0.9,
              }}
            >
              <Popup>{nombreDestino}</Popup>
            </CircleMarker>
          </MapContainer>
        </div>
      ) : (
        <div
          className="flex min-h-[19rem] flex-col items-center justify-center px-6 py-12 text-center"
          data-testid="mapa-sin-coordenada"
        >
          <p className="text-sm font-bold text-[#263029]">
            Este destino aún no tiene coordenada registrada.
          </p>
        </div>
      )}

      {/* Coordenadas reales del backend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#5B3A29]/15 px-6 py-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A8177]">
          Coordenada PostGIS
        </p>

        <p className="font-mono text-sm font-bold tabular-nums text-[#233128]">
          {formatearCoordenadas(ubicacion)}
        </p>
      </div>
    </section>
  );
}
