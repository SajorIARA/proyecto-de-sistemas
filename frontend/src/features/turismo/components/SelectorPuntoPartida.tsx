/**
 * Punto de partida del constructor de ruta.
 *
 * El turista puede fijar el origen con su ubicación actual (GPS) o marcando un
 * punto en el mapa. No se inventa ningún dato: solo se guarda la coordenada
 * elegida y el backend calcula después la ruta real por calles desde ahí.
 */

import { useEffect, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "../../../hooks/useGeolocation";
import {
  crearPuntoPartida,
  etiquetaPuntoPartida,
  formatearCoordenadas,
  type PuntoPartidaRuta,
} from "../utils/puntoPartida";

interface SelectorPuntoPartidaProps {
  origen: PuntoPartidaRuta | null;
  onCambiar: (origen: PuntoPartidaRuta | null) => void;
}

function CapturarClic({
  onElegir,
}: {
  onElegir: (latitud: number, longitud: number) => void;
}) {
  useMapEvents({
    click(evento) {
      onElegir(evento.latlng.lat, evento.latlng.lng);
    },
  });

  return null;
}

function MiniMapaOrigen({
  origen,
  onElegir,
}: {
  origen: PuntoPartidaRuta | null;
  onElegir: (latitud: number, longitud: number) => void;
}) {
  return (
    <MapContainer
      center={[
        origen?.latitud ?? -16.4897,
        origen?.longitud ?? -68.1193,
      ]}
      zoom={origen ? 14 : 12}
      scrollWheelZoom
      className="h-56 w-full rounded-xl border border-[var(--color-border)]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CapturarClic onElegir={onElegir} />
      {origen && (
        <CircleMarker
          center={[origen.latitud, origen.longitud]}
          radius={8}
          pathOptions={{ color: "#8D4F32", fillColor: "#8D4F32" }}
        >
          <Tooltip>Punto de partida</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}

export function SelectorPuntoPartida({
  origen,
  onCambiar,
}: SelectorPuntoPartidaProps) {
  const { coords, loading, error, errorMessage, getCurrentPosition, reset } =
    useGeolocation({ maximumAge: 60000 });
  const [aviso, setAviso] = useState<string | null>(null);
  const [modoMapa, setModoMapa] = useState(false);
  const onCambiarRef = useRef(onCambiar);
  onCambiarRef.current = onCambiar;

  const coordsProcesadas = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!coords || coordsProcesadas.current === coords) {
      return;
    }
    coordsProcesadas.current = coords;

    const punto = crearPuntoPartida(coords.latitude, coords.longitude, "gps");
    if (punto === null) {
      setAviso(
        "Tu ubicación está fuera del área de La Paz. Marcá un punto dentro del mapa.",
      );
    } else {
      setAviso(null);
      setModoMapa(false);
      onCambiarRef.current(punto);
    }
    reset();
  }, [coords, reset]);

  function elegirEnMapa(latitud: number, longitud: number) {
    const punto = crearPuntoPartida(latitud, longitud, "mapa");
    if (punto === null) {
      setAviso("El punto debe estar dentro del área de La Paz.");
      return;
    }

    setAviso(null);
    onCambiar(punto);
    setModoMapa(false);
  }

  function quitar() {
    setAviso(null);
    setModoMapa(false);
    onCambiar(null);
  }

  const avisoTecnico = errorMessage?.replace(
    "Puedes seleccionar un macrodistrito manualmente.",
    "Puedes marcar un punto en el mapa.",
  );
  const avisoVisible = aviso ?? (error ? avisoTecnico : null);

  return (
    <fieldset className="border-t border-[var(--color-border)] px-5 py-5">
      <legend className="px-1 font-data text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        Punto de partida
      </legend>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
        Los minutos de traslado se calculan desde acá, no desde un valor fijo.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={getCurrentPosition}
          disabled={loading}
          className="min-h-11 rounded-full border border-[var(--color-route-strong)]/30 bg-[var(--color-route-strong)]/10 px-4 py-2 text-xs font-black text-[var(--color-brand)] transition hover:border-[var(--color-route-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ubicando…" : "Usar mi ubicación"}
        </button>
        <button
          type="button"
          onClick={() => setModoMapa((activo) => !activo)}
          aria-pressed={modoMapa}
          className="min-h-11 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-route-strong)]"
        >
          {modoMapa ? "Cancelar marcado" : "Marcar en el mapa"}
        </button>
        {origen && (
          <button
            type="button"
            onClick={quitar}
            className="min-h-11 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-black text-[var(--color-text-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
          >
            Quitar punto de partida
          </button>
        )}
      </div>

      {modoMapa && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold text-[var(--color-text)]">
            Hacé clic en el mapa para fijar el punto de salida.
          </p>
          <MiniMapaOrigen origen={origen} onElegir={elegirEnMapa} />
        </div>
      )}

      {origen && (
        <p role="status" className="mt-3 text-xs font-bold text-[var(--color-brand)]">
          Origen: {etiquetaPuntoPartida(origen)} · {formatearCoordenadas(origen)}
        </p>
      )}

      {avisoVisible && (
        <p role="alert" className="mt-3 text-xs font-bold text-[var(--color-danger)]">
          {avisoVisible}
        </p>
      )}
    </fieldset>
  );
}
