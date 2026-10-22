/**
 * Punto de partida espacial del recorrido.
 *
 * Es opcional en el formulario: si el turista no lo completa, se guardan las
 * preferencias pero no las restricciones de recorrido. Cuando se completa,
 * debe caer dentro del área de La Paz que valida el backend (El Alto–Mallasa).
 *
 * El botón "Usar mi ubicación" lee `navigator.geolocation`; si el permiso
 * falla o el navegador no lo soporta se avisa sin romper el formulario.
 */

import { useState } from "react";
import { LA_PAZ_BBOX } from "../../../config/preferencias";

interface PuntoPartidaProps {
  latitud: string;
  longitud: string;
  onLatitud: (valor: string) => void;
  onLongitud: (valor: string) => void;
  error?: string | null;
  disabled?: boolean;
}

const BBOX_TEXTO = `${LA_PAZ_BBOX.latitud.min}…${LA_PAZ_BBOX.latitud.max} lat · ${LA_PAZ_BBOX.longitud.min}…${LA_PAZ_BBOX.longitud.max} lon`;

export function PuntoPartida({
  latitud,
  longitud,
  onLatitud,
  onLongitud,
  error = null,
  disabled = false,
}: PuntoPartidaProps) {
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  function usarUbicacion() {
    if (!("geolocation" in navigator)) {
      setAvisoUbicacion(
        "Tu navegador no ofrece geolocalización. Ingresa las coordenadas a mano.",
      );
      return;
    }

    setBuscando(true);
    setAvisoUbicacion(null);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        onLatitud(posicion.coords.latitude.toFixed(6));
        onLongitud(posicion.coords.longitude.toFixed(6));
        setAvisoUbicacion(null);
        setBuscando(false);
      },
      () => {
        setAvisoUbicacion(
          "No pudimos obtener tu ubicación. Revisa el permiso o ingrésala a mano.",
        );
        setBuscando(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function limpiar() {
    onLatitud("");
    onLongitud("");
    setAvisoUbicacion(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]">
          Punto de partida
          <span className="ml-2 normal-case tracking-normal text-[#8A8177]">
            (opcional)
          </span>
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={usarUbicacion}
            disabled={disabled || buscando}
            className="rounded-full border border-[#2F4B3B]/25 bg-[#2F4B3B]/[0.07] px-4 py-2 text-xs font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {buscando ? "Ubicando…" : "Usar mi ubicación"}
          </button>

          {(latitud !== "" || longitud !== "") && (
            <button
              type="button"
              onClick={limpiar}
              disabled={disabled}
              className="rounded-full border border-[#5B3A29]/15 px-4 py-2 text-xs font-black text-[#746D63] transition hover:border-[#9A5B3C]/45 hover:text-[#8D4F32] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
            Latitud
          </span>

          <input
            type="text"
            inputMode="decimal"
            value={latitud}
            onChange={(evento) => onLatitud(evento.target.value)}
            disabled={disabled}
            placeholder="-16.5000"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "punto-partida-error" : undefined}
            data-testid="input-latitud"
            className={[
              "mt-2 w-full rounded-2xl border bg-[#F3EBDD]/60 px-4 py-3 text-sm text-[#263029] transition",
              error
                ? "border-[#9A5B3C] focus:border-[#9A5B3C]"
                : "border-[#5B3A29]/15 focus:border-[#2F4B3B]",
            ].join(" ")}
          />
        </label>

        <label className="block">
          <span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
            Longitud
          </span>

          <input
            type="text"
            inputMode="decimal"
            value={longitud}
            onChange={(evento) => onLongitud(evento.target.value)}
            disabled={disabled}
            placeholder="-68.1500"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "punto-partida-error" : undefined}
            data-testid="input-longitud"
            className={[
              "mt-2 w-full rounded-2xl border bg-[#F3EBDD]/60 px-4 py-3 text-sm text-[#263029] transition",
              error
                ? "border-[#9A5B3C] focus:border-[#9A5B3C]"
                : "border-[#5B3A29]/15 focus:border-[#2F4B3B]",
            ].join(" ")}
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-[#746D63]">
        Dentro del área de La Paz: {BBOX_TEXTO}.
      </p>

      {avisoUbicacion && (
        <p role="alert" className="mt-2 text-xs font-semibold text-[#9A3B2E]">
          {avisoUbicacion}
        </p>
      )}

      {error && (
        <p
          id="punto-partida-error"
          role="alert"
          className="mt-1 text-xs font-semibold text-[#9A3B2E]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
