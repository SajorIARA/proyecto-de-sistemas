import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../../api/http";
import { TURISMO_ENDPOINTS } from "../../../config/turismo";
import type { Atractivo } from "../../../types/turismo";
import {
  etiquetaPuntoPartida,
  type PuntoPartidaRuta,
} from "../utils/puntoPartida";

interface MapaRutaProps {
  destinos: Atractivo[];
  paradas: Atractivo[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  /** Origen elegido en los filtros; se antepone a las paradas en el ruteo. */
  origen?: PuntoPartidaRuta | null;
  /** Comunica el resultado real al resumen de la revisión. */
  onRuteo?: (datos: RespuestaRuteo | null) => void;
}

export interface RespuestaRuteo {
  origen: string;
  distancia_km: number;
  duracion_minutos: number;
  trazado: [number, number][];
}

function AjustarVista({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap();

  useEffect(() => {
    if (puntos.length === 1) {
      mapa.setView(puntos[0], 14);
    } else if (puntos.length > 1) {
      mapa.fitBounds(puntos, { padding: [36, 36] });
    }
  }, [mapa, puntos]);

  return null;
}

export function MapaRuta({
  destinos,
  paradas,
  seleccionadoId,
  onSeleccionar,
  origen = null,
  onRuteo,
}: MapaRutaProps) {
  const [ruteo, setRuteo] = useState<RespuestaRuteo | null>(null);
  const [calculando, setCalculando] = useState(false);
  const onRuteoRef = useRef(onRuteo);
  onRuteoRef.current = onRuteo;
  const conUbicacion = useMemo(
    () => destinos.filter((destino) => destino.ubicacion !== null),
    [destinos],
  );
  const puntosRuta = useMemo(
    () => [
      ...(origen
        ? [[origen.latitud, origen.longitud] as [number, number]]
        : []),
      ...paradas.flatMap((destino) =>
        destino.ubicacion
          ? [[destino.ubicacion.latitud, destino.ubicacion.longitud] as [number, number]]
          : [],
      ),
    ],
    [origen, paradas],
  );
  const claveRuta = puntosRuta.map((punto) => punto.join(",")).join(";");

  useEffect(() => {
    setRuteo(null);
    onRuteoRef.current?.(null);
    if (puntosRuta.length < 2) return;

    const control = new AbortController();
    setCalculando(true);
    void api
      .post<RespuestaRuteo>(
        TURISMO_ENDPOINTS.ruteo,
        {
          puntos: puntosRuta.map(([latitud, longitud]) => ({ latitud, longitud })),
        },
        { signal: control.signal },
      )
      .then(({ data }) => {
        if (Array.isArray(data?.trazado) && data.trazado.length >= 2) {
          setRuteo(data);
          onRuteoRef.current?.(data);
        }
      })
      .catch(() => {
        // Sin OSRM se mantiene la línea recta, rotulada como aproximada y
        // sin cifras de km/min: no se inventa un tiempo de traslado.
      })
      .finally(() => {
        if (!control.signal.aborted) setCalculando(false);
      });

    return () => control.abort();
    // `claveRuta` resume las coordenadas en orden; evita reconsultar por
    // cambios de identidad de los objetos sin cambio de posición.
  }, [claveRuta]);

  const trazado = ruteo?.trazado ?? puntosRuta;
  const puntosVista = puntosRuta.length > 0
    ? puntosRuta
    : conUbicacion.flatMap((destino) =>
        destino.ubicacion
          ? [[destino.ubicacion.latitud, destino.ubicacion.longitud] as [number, number]]
          : [],
      );
  const esAproximado = !ruteo;

  return (
    <section
      className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-labelledby="titulo-mapa-ruta"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
        <div>
          <h2 id="titulo-mapa-ruta" className="font-black">
            Mapa del recorrido
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {paradas.length === 0
              ? "Añade destinos para dibujar el recorrido."
              : `${paradas.length} ${paradas.length === 1 ? "parada seleccionada" : "paradas seleccionadas"}.`}
            {origen && ` Desde ${etiquetaPuntoPartida(origen)}.`}
          </p>
        </div>
        <div className="text-right">
          <span className="font-data text-sm font-bold text-[var(--color-brand)]">
            {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
          </span>
          <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]" role="status">
            {calculando
              ? "Calculando ruta por calles…"
              : puntosRuta.length < 2
                ? "Sin ruta calculable"
                : esAproximado
                  ? "Trazado aproximado (línea recta)"
                  : `Ruta por calles · ${ruteo?.distancia_km} km · ${ruteo?.duracion_minutos} min`}
          </p>
        </div>
      </div>

      <div
        role="region"
        aria-label="Mapa interactivo de las paradas seleccionadas"
        className="h-[28rem] sm:h-[38rem]"
      >
      <MapContainer center={[-16.4897, -68.1193]} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarVista puntos={puntosVista} />
        {trazado.length > 1 && (
          <Polyline
            positions={trazado}
            pathOptions={{
              color: "#008F83",
              weight: 4,
              ...(esAproximado ? { dashArray: "8 10" } : {}),
            }}
          />
        )}
        {origen && (
          <CircleMarker
            center={[origen.latitud, origen.longitud]}
            radius={10}
            pathOptions={{
              color: "#FFFFFF",
              weight: 3,
              fillColor: "#8D4F32",
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              Punto de partida
            </Tooltip>
          </CircleMarker>
        )}
        {conUbicacion.map((destino) => {
          const indice = paradas.findIndex((parada) => parada.id === destino.id);
          const enRuta = indice >= 0;
          const seleccionado = destino.id === seleccionadoId;
          const posicion: [number, number] = [destino.ubicacion!.latitud, destino.ubicacion!.longitud];

          return (
            <CircleMarker
              key={destino.id}
              center={posicion}
              radius={seleccionado ? 13 : enRuta ? 10 : 7}
              pathOptions={{
                color: "#FFFFFF",
                weight: 3,
                fillColor: enRuta ? "#008F83" : "#0B5FFF",
                fillOpacity: seleccionado ? 1 : 0.82,
              }}
              eventHandlers={{ click: () => onSeleccionar(destino.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                {enRuta ? `${indice + 1}. ` : ""}{destino.nombre}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      </div>
      {paradas.length > 0 && (
        <ol className="grid gap-px border-t border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
          {paradas.map((parada, indice) => (
            <li key={parada.id} className="bg-[var(--color-surface)] p-3 text-sm">
              <span className="font-data font-bold text-[var(--color-brand)]">
                {indice + 1}.
              </span>{" "}
              <span className="font-bold">{parada.nombre}</span>
              {!parada.ubicacion && (
                <span className="ml-2 text-xs text-[var(--color-warning)]">
                  Sin coordenadas
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
