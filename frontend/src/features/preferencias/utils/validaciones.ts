/**
 * Validaciones puras del formulario de preferencias.
 *
 * Se mantienen separadas de los componentes para poder probarlas sin montar
 * React y para que el formulario y los tests compartan exactamente las mismas
 * reglas. Replican las validaciones del backend (bbox de La Paz, números
 * positivos en BOB) para dar feedback inmediato, sin sustituirlas: el
 * servidor sigue siendo la autoridad final.
 */

import {
  BORRADOR_INICIAL,
  DURACION,
  LA_PAZ_BBOX,
  PRESUPUESTO_BOB,
} from "../../../config/preferencias";
import type {
  PreferenciasFormValues,
  UnidadDuracion,
} from "../../../types/preferencias";

/** Campos que el formulario puede marcar en rojo. */
export type CampoPreferencias =
  | "categorias"
  | "presupuesto"
  | "duracion"
  | "puntoPartida";

export type ErroresPreferencias = Partial<Record<CampoPreferencias, string>>;

/** Convierte la duración a horas (1 día = 24 h). */
export function duracionAHoras(
  valor: number,
  unidad: UnidadDuracion,
): number {
  return unidad === "dias" ? valor * 24 : valor;
}

/** Limita un número al rango indicado. */
export function limitar(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

/** Redondea al múltiplo del paso más cercano (evita 0.30000000000000004). */
export function redondearAPaso(valor: number, paso: number): number {
  return Number((Math.round(valor / paso) * paso).toFixed(4));
}

/** Formatea un monto en bolivianos: "Bs 1.500". */
export function formatearBob(valor: number): string {
  return `Bs ${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 2,
  }).format(valor)}`;
}

/** Formatea una duración legible: "8 horas" · "2 días". */
export function formatearDuracion(valor: number, unidad: UnidadDuracion): string {
  if (unidad === "dias") {
    return valor === 1 ? "1 día" : `${valor} días`;
  }

  return valor === 1 ? "1 hora" : `${valor} horas`;
}

/** Convierte el texto de un input en número decimal, o `null` si no es válido. */
export function parsearCoordenada(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");

  if (limpio === "") {
    return null;
  }

  const numero = Number(limpio);

  return Number.isFinite(numero) ? numero : null;
}

/** ¿El punto cae dentro del área de La Paz que valida el backend? */
export function dentroDelAreaLaPaz(
  longitud: number,
  latitud: number,
): boolean {
  return (
    longitud >= LA_PAZ_BBOX.longitud.min &&
    longitud <= LA_PAZ_BBOX.longitud.max &&
    latitud >= LA_PAZ_BBOX.latitud.min &&
    latitud <= LA_PAZ_BBOX.latitud.max
  );
}

function validarPuntoPartida(
  latitudTexto: string,
  longitudTexto: string,
): string | undefined {
  const vacioLat = latitudTexto.trim() === "";
  const vacioLon = longitudTexto.trim() === "";

  // El punto de partida es opcional: sin coordenadas no se guardan las
  // restricciones de recorrido, pero las preferencias sí.
  if (vacioLat && vacioLon) {
    return undefined;
  }

  if (vacioLat || vacioLon) {
    return "Completa latitud y longitud, o deja ambas vacías.";
  }

  const latitud = parsearCoordenada(latitudTexto);
  const longitud = parsearCoordenada(longitudTexto);

  if (latitud === null || longitud === null) {
    return "Usa números válidos (coordenadas decimales).";
  }

  if (!dentroDelAreaLaPaz(longitud, latitud)) {
    return "El punto de partida debe estar dentro de La Paz (El Alto–Mallasa).";
  }

  return undefined;
}

/** Valida el borrador completo y devuelve los errores por campo. */
export function validarPreferencias(
  valores: PreferenciasFormValues,
): ErroresPreferencias {
  const errores: ErroresPreferencias = {};

  if (valores.categorias.length === 0) {
    errores.categorias = "Selecciona al menos una categoría temática.";
  }

  if (!Number.isFinite(valores.presupuestoBob)) {
    errores.presupuesto = "Ingresa un presupuesto válido.";
  } else if (valores.presupuestoBob < PRESUPUESTO_BOB.min) {
    errores.presupuesto = "El presupuesto no puede ser negativo.";
  } else if (valores.presupuestoBob > PRESUPUESTO_BOB.max) {
    errores.presupuesto = `El presupuesto máximo es ${formatearBob(
      PRESUPUESTO_BOB.max,
    )}.`;
  }

  const horas = duracionAHoras(valores.duracionValor, valores.duracionUnidad);

  if (!Number.isFinite(horas) || horas <= 0) {
    errores.duracion = "La duración debe ser mayor a 0.";
  } else if (horas > DURACION.maxHoras) {
    errores.duracion = `La duración máxima es ${DURACION.maxHoras} horas.`;
  }

  const errorPunto = validarPuntoPartida(valores.latitud, valores.longitud);

  if (errorPunto) {
    errores.puntoPartida = errorPunto;
  }

  return errores;
}

/** ¿La latitud/longitud están listas para enviarse al backend? */
export function puntoPartidaListo(valores: PreferenciasFormValues): boolean {
  return validarPuntoPartida(valores.latitud, valores.longitud) === undefined
    && valores.latitud.trim() !== ""
    && valores.longitud.trim() !== "";
}

/** Borrador neutro, para reiniciar el formulario. */
export function borradorInicial(): PreferenciasFormValues {
  return { ...BORRADOR_INICIAL, categorias: [] };
}
