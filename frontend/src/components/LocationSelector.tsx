import { useState, useEffect } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { MACRODISTRITOS_LA_PAZ, type Macrodistrito } from "../config/macrodistritos";

export interface UbicacionSeleccionada {
  tipo: "gps" | "macrodistrito";
  latitud: number;
  longitud: number;
  macrodistrito?: string;
}

interface LocationSelectorProps {
  onUbicacionChange: (ubicacion: UbicacionSeleccionada | null) => void;
  ubicacionInicial?: UbicacionSeleccionada | null;
  guardarEnLocalStorage?: boolean;
  localStorageKey?: string;
}

const DEFAULT_LOCAL_STORAGE_KEY = "turismo_ubicacion_seleccionada";

export function LocationSelector({
  onUbicacionChange,
  ubicacionInicial = null,
  guardarEnLocalStorage = true,
  localStorageKey = DEFAULT_LOCAL_STORAGE_KEY,
}: LocationSelectorProps) {
  const { coords, loading, error, errorMessage, getCurrentPosition } =
    useGeolocation();
  const [macrodistritoSeleccionado, setMacrodistritoSeleccionado] = useState<string>("");
  const [ubicacionActiva, setUbicacionActiva] = useState<UbicacionSeleccionada | null>(
    ubicacionInicial
  );

  // Cargar ubicación guardada en localStorage al montar
  useEffect(() => {
    if (guardarEnLocalStorage && !ubicacionInicial) {
      try {
        const guardada = localStorage.getItem(localStorageKey);
        if (guardada) {
          try {
            const parsed = JSON.parse(guardada) as { tipo?: string; id?: string; macrodistrito?: string };
            if (parsed.tipo === "macrodistrito" && parsed.id) {
              const macrodistrito = MACRODISTRITOS_LA_PAZ.find(
                (m: Macrodistrito) => m.id === parsed.id
              );
              if (macrodistrito) {
                const nuevaUbicacion: UbicacionSeleccionada = {
                  tipo: "macrodistrito",
                  latitud: macrodistrito.latitud,
                  longitud: macrodistrito.longitud,
                  macrodistrito: macrodistrito.nombre,
                };
                setUbicacionActiva(nuevaUbicacion);
                setMacrodistritoSeleccionado(macrodistrito.nombre);
                onUbicacionChange(nuevaUbicacion);
                return;
              }
            }
            if (parsed.tipo === "macrodistrito" && parsed.macrodistrito) {
              const macrodistrito = MACRODISTRITOS_LA_PAZ.find(
                (m: Macrodistrito) => m.nombre === parsed.macrodistrito
              );
              if (macrodistrito) {
                const nuevaUbicacion: UbicacionSeleccionada = {
                  tipo: "macrodistrito",
                  latitud: macrodistrito.latitud,
                  longitud: macrodistrito.longitud,
                  macrodistrito: macrodistrito.nombre,
                };
                setUbicacionActiva(nuevaUbicacion);
                setMacrodistritoSeleccionado(macrodistrito.nombre);
                onUbicacionChange(nuevaUbicacion);
                return;
              }
            }
            // No restaurar ubicaciones GPS desde localStorage por razones de seguridad
            localStorage.removeItem(localStorageKey);
          } catch {
            localStorage.removeItem(localStorageKey);
          }
        }
      } catch {
        // Ignorar errores de localStorage
      }
    }
  }, []);

  // Cuando se obtienen coordenadas GPS, actualizar ubicación (no se guarda en localStorage)
  useEffect(() => {
    if (coords) {
      const nuevaUbicacion: UbicacionSeleccionada = {
        tipo: "gps",
        latitud: coords.latitude,
        longitud: coords.longitude,
      };
      setUbicacionActiva(nuevaUbicacion);
      setMacrodistritoSeleccionado("");
      // No guardar coordenadas GPS en localStorage
      onUbicacionChange(nuevaUbicacion);
    }
  }, [coords]);

  const handleUsarUbicacionActual = () => {
    getCurrentPosition();
  };

  const handleSeleccionarMacrodistrito = (nombre: string) => {
    setMacrodistritoSeleccionado(nombre);

    if (nombre === "") {
      setUbicacionActiva(null);
      if (guardarEnLocalStorage) {
        try {
          localStorage.removeItem(localStorageKey);
        } catch {
          // Ignorar errores de localStorage
        }
      }
      onUbicacionChange(null);
      return;
    }

    const macrodistrito = MACRODISTRITOS_LA_PAZ.find(
      (m: Macrodistrito) => m.nombre === nombre
    );

    if (macrodistrito) {
      const nuevaUbicacion: UbicacionSeleccionada = {
        tipo: "macrodistrito",
        latitud: macrodistrito.latitud,
        longitud: macrodistrito.longitud,
        macrodistrito: macrodistrito.nombre,
      };
      setUbicacionActiva(nuevaUbicacion);
      if (guardarEnLocalStorage) {
        try {
          // Solo guardar identificador del macrodistrito, no coordenadas
          localStorage.setItem(
            localStorageKey,
            JSON.stringify({ tipo: "macrodistrito", id: macrodistrito.id })
          );
        } catch {
          // Ignorar errores de localStorage
        }
      }
      onUbicacionChange(nuevaUbicacion);
    }
  };

  const handleLimpiarUbicacion = () => {
    setMacrodistritoSeleccionado("");
    setUbicacionActiva(null);
    if (guardarEnLocalStorage) {
      try {
        localStorage.removeItem(localStorageKey);
      } catch {
        // Ignorar errores de localStorage
      }
    }
    onUbicacionChange(null);
  };

  const obtenerEtiquetaActiva = () => {
    if (!ubicacionActiva) {
      return "Sin ubicación seleccionada";
    }
    if (ubicacionActiva.tipo === "gps") {
      return "Ubicación GPS activa";
    }
    if (ubicacionActiva.tipo === "macrodistrito" && ubicacionActiva.macrodistrito) {
      return `Macrodistrito: ${ubicacionActiva.macrodistrito}`;
    }
    return "Ubicación seleccionada";
  };

  return (
    <div className="w-full rounded-[1.25rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] p-4 shadow-[0_8px_30px_rgba(72,55,38,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#8D4F32]">
            Ubicación
          </span>
          <span className="inline-flex items-center rounded-full border border-[#2F4B3B]/20 bg-[#2F4B3B]/[0.06] px-3 py-1 text-[0.7rem] font-bold text-[#2F4B3B]">
            {obtenerEtiquetaActiva()}
          </span>
        </div>
        {ubicacionActiva && (
          <button
            type="button"
            onClick={handleLimpiarUbicacion}
            className="text-xs font-bold text-[#8D4F32] underline-offset-4 hover:underline"
          >
            Limpiar ubicación / Ver todos
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleUsarUbicacionActual}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2F4B3B] px-5 py-2.5 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Ubicando…
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Usar mi ubicación actual
            </>
          )}
        </button>

        <select
          value={macrodistritoSeleccionado}
          onChange={(e) => handleSeleccionarMacrodistrito(e.target.value)}
          className="flex-1 rounded-full border border-[#5B3A29]/15 bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#514B43] transition hover:border-[#2F4B3B]/40 focus:border-[#2F4B3B] focus:outline-none"
        >
          <option value="">Seleccionar macrodistrito manualmente</option>
          {MACRODISTRITOS_LA_PAZ.map((macrodistrito: Macrodistrito) => (
            <option key={macrodistrito.id} value={macrodistrito.nombre}>
              {macrodistrito.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && errorMessage && (
        <div className="mt-3 rounded-2xl border border-[#9A5B3C]/30 bg-[#9A5B3C]/[0.06] p-3 text-xs font-semibold text-[#8D4F32]">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
