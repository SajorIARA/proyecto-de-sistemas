/**
 * Estimación de traslado para completar el desglose de costos.
 *
 * El motor de recomendación solo entrega `distancia_km`; el costo de entrada
 * viene en `costo_bob`. Para mostrar un total útil al turista se estima un
 * viaje de ida y vuelta con una tarifa referencial urbana. Es una
 * aproximación, no una tarifa oficial, y la interfaz la rotula como tal.
 */

import { TRASLADO } from "../../../config/recomendaciones";

export interface EstimacionTraslado {
  /** Kilómetros recorridos de ida y vuelta. */
  kilometros: number;
  /** Costo referencial en bolivianos (entero). */
  costoBob: number;
  /** Minutos totales de viaje (entero). */
  minutos: number;
}

function aDistanciaValida(distanciaKm: number): number {
  if (!Number.isFinite(distanciaKm) || distanciaKm <= 0) {
    return 0;
  }

  return distanciaKm;
}

/** Calcula kilómetros, costo y minutos de traslado ida y vuelta. */
export function estimarTraslado(distanciaKm: number): EstimacionTraslado {
  const distancia = aDistanciaValida(distanciaKm);
  const kilometros = distancia * 2;

  if (kilometros === 0) {
    return { kilometros: 0, costoBob: 0, minutos: 0 };
  }

  const costoCalculado = kilometros * TRASLADO.tarifaPorKmBob;
  const costoBob = Math.max(
    TRASLADO.tarifaMinimaBob,
    Math.round(costoCalculado),
  );
  const minutos = Math.max(
    TRASLADO.minutosBase,
    Math.round((kilometros / TRASLADO.velocidadPromedioKmH) * 60),
  );

  return {
    kilometros: Number(kilometros.toFixed(1)),
    costoBob,
    minutos,
  };
}

/** Formatea una distancia: "800 m" o "2,4 km". */
export function formatearDistancia(distanciaKm: number): string {
  const distancia = aDistanciaValida(distanciaKm);

  if (distancia < 1) {
    return `${Math.round(distancia * 1000)} m`;
  }

  return `${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 1,
  }).format(distancia)} km`;
}

/** Formatea minutos: "45 min" o "1 h 20 min". */
export function formatearMinutos(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) {
    return "0 min";
  }

  const total = Math.round(minutos);
  const horas = Math.floor(total / 60);
  const resto = total % 60;

  if (horas === 0) {
    return `${resto} min`;
  }

  if (resto === 0) {
    return `${horas} h`;
  }

  return `${horas} h ${resto} min`;
}
