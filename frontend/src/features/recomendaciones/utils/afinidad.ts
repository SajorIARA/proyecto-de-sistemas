/**
 * Lectura visual del puntaje del motor y de sus motivos de penalización.
 *
 * El backend entrega `puntaje` en [0, 1] y una lista de motivos técnicos
 * (`presupuesto_excedido`, `tiempo_excedido`). Estas funciones traducen
 * ambos a porcentajes y textos para la tarjeta, sin inventar datos.
 */

import type { MotivoRecomendacion } from "../../../types/recomendaciones";

export interface NivelAfinidad {
  etiqueta: string;
  /** Explicación corta para el tooltip / texto secundario. */
  detalle: string;
}

function acotar(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 0;
  }

  return Math.min(Math.max(valor, 0), 1);
}

/** Convierte el puntaje 0–1 en el porcentaje entero que ve el turista. */
export function porcentajeAfinidad(puntaje: number): number {
  return Math.round(acotar(puntaje) * 100);
}

/** Etiqueta cualitativa del porcentaje de coincidencia. */
export function nivelAfinidad(porcentaje: number): NivelAfinidad {
  const valor = Math.min(Math.max(porcentaje, 0), 100);

  if (valor >= 80) {
    return {
      etiqueta: "Coincidencia muy alta",
      detalle: "Encaja con tus intereses, tu tiempo y tu presupuesto.",
    };
  }

  if (valor >= 60) {
    return {
      etiqueta: "Coincidencia alta",
      detalle: "Es una opción sólida dentro de tu perfil de viaje.",
    };
  }

  if (valor >= 40) {
    return {
      etiqueta: "Coincidencia media",
      detalle: "Vale la pena si querés variar el plan.",
    };
  }

  if (valor >= 20) {
    return {
      etiqueta: "Coincidencia baja",
      detalle: "Se aleja un poco de tus preferencias actuales.",
    };
  }

  return {
    etiqueta: "Para explorar",
    detalle: "No coincide del todo con el perfil, pero sigue dentro de tus límites.",
  };
}

const MOTIVOS: Record<string, string> = {
  presupuesto_excedido: "Supera el presupuesto del recorrido",
  tiempo_excedido: "Excede el tiempo disponible",
};

/** Texto legible de un motivo técnico; tolera motivos futuros. */
export function describirMotivo(motivo: MotivoRecomendacion): string {
  if (MOTIVOS[motivo]) {
    return MOTIVOS[motivo];
  }

  return motivo
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toUpperCase());
}
