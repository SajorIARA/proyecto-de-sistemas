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
      className="chuki-info-panel overflow-hidden rounded-[1.85rem] border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)]/[0.08] px-6 py-5">
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[var(--color-brand)]">
            Ubicación
          </p>

          <h3
            id="mapa-destino"
            className="mt-1 text-lg font-black tracking-tight text-[var(--color-text)]"
          >
            Cómo llegar
          </h3>
        </div>

        <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[var(--color-text)]">
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
          <p className="text-sm font-bold text-[var(--color-text)]">
            Este destino aún no tiene coordenada registrada.
          </p>
        </div>
      )}

      {/* Coordenadas reales del backend */}
      <div className="flex items-center justify-center border-t border-[var(--color-border)]/[0.08] px-6 py-4">
        <p className="font-mono text-sm font-bold tabular-nums text-[var(--color-text)]">
          {formatearCoordenadas(ubicacion)}
        </p>
      </div>
    </section>
  );
}
