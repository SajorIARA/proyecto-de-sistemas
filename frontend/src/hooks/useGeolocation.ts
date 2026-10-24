import { useState, useCallback } from "react";

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

export type GeolocationErrorType =
  | "not-supported"
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "unknown";

export interface GeolocationState {
  coords: GeolocationCoords | null;
  loading: boolean;
  error: GeolocationErrorType | null;
  errorMessage: string | null;
}

export interface UseGeolocationReturn extends GeolocationState {
  getCurrentPosition: () => void;
  reset: () => void;
}

export function useGeolocation(options: PositionOptions = {}): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
    errorMessage: null,
  });

  const getCurrentPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({
        coords: null,
        loading: false,
        error: "not-supported",
        errorMessage: "Tu navegador no ofrece geolocalización.",
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null, errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          loading: false,
          error: null,
          errorMessage: null,
        });
      },
      (error) => {
        let errorType: GeolocationErrorType = "unknown";
        let errorMessage = "No pudimos obtener tu ubicación.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = "permission-denied";
            errorMessage =
              "Permiso denegado para acceder a tu ubicación. Puedes seleccionar un macrodistrito manualmente.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = "position-unavailable";
            errorMessage =
              "La información de ubicación no está disponible. Puedes seleccionar un macrodistrito manualmente.";
            break;
          case error.TIMEOUT:
            errorType = "timeout";
            errorMessage =
              "Se agotó el tiempo para obtener tu ubicación. Puedes seleccionar un macrodistrito manualmente.";
            break;
          default:
            errorType = "unknown";
            errorMessage =
              "Ocurrió un error al obtener tu ubicación. Puedes seleccionar un macrodistrito manualmente.";
            break;
        }

        setState({
          coords: null,
          loading: false,
          error: errorType,
          errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
        ...options,
      }
    );
  }, [options]);

  const reset = useCallback(() => {
    setState({
      coords: null,
      loading: false,
      error: null,
      errorMessage: null,
    });
  }, []);

  return {
    ...state,
    getCurrentPosition,
    reset,
  };
}
