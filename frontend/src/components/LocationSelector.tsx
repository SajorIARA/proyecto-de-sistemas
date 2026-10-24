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
  onUbicacionChange: (ubicacion: UbicacionSeleccionada) => void;
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
          const parsed = JSON.parse(guardada) as UbicacionSeleccionada;
          setUbicacionActiva(parsed);
          if (parsed.tipo === "macrodistrito" && parsed.macrodistrito) {
            setMacrodistritoSeleccionado(parsed.macrodistrito);
          }
          onUbicacionChange(parsed);
        }
      } catch {
        // Ignorar errores de localStorage
      }
    }
  }, [guardarEnLocalStorage, ubicacionInicial, localStorageKey, onUbicacionChange]);

  // Cuando se obtienen coordenadas GPS, actualizar ubicación
  useEffect(() => {
    if (coords) {
      const nuevaUbicacion: UbicacionSeleccionada = {
        tipo: "gps",
        latitud: coords.latitude,
        longitud: coords.longitude,
      };
      setUbicacionActiva(nuevaUbicacion);
      setMacrodistritoSeleccionado("");
      if (guardarEnLocalStorage) {
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(nuevaUbicacion));
        } catch {
          // Ignorar errores de localStorage
        }
      }
      onUbicacionChange(nuevaUbicacion);
    }
  }, [coords, guardarEnLocalStorage, localStorageKey, onUbicacionChange]);

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
          localStorage.setItem(localStorageKey, JSON.stringify(nuevaUbicacion));
        } catch {
          // Ignorar errores de localStorage
        }
      }
      onUbicacionChange(nuevaUbicacion);
    }
  };

  const obtenerEtiquetaActiva = () => {
    if (!ubicacionActiva) {
      return "Sin ubicación seleccionada";
    }
    if (ubicacionActiva.tipo === "gps") {
      return `Ubicación GPS (${ubicacionActiva.latitud.toFixed(4)}, ${ubicacionActiva.longitud.toFixed(4)})`;
    }
    if (ubicacionActiva.tipo === "macrodistrito" && ubicacionActiva.macrodistrito) {
      return `Macrodistrito: ${ubicacionActiva.macrodistrito}`;
    }
    return "Ubicación seleccionada";
  };

  return (
    <div className="w-full space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Ubicación para búsqueda
        </h3>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {obtenerEtiquetaActiva()}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleUsarUbicacionActual}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              Ubicando...
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
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          <div className="flex gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
