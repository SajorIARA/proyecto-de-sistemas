/**
 * Persistencia temporal del borrador de preferencias en `localStorage`.
 *
 * El borrador no es un dato de negocio: es lo que el turista lleva escrito
 * sin guardar. Por eso vive fuera de la caché de TanStack Query y se limpia
 * en cuanto la operación se completa o el usuario lo descarta.
 *
 * La lectura sanea el JSON: `localStorage` lo puede editar cualquiera, así que
 * un borrador corrupto o con tipos raros se descarta en vez de romper la
 * pantalla.
 */

import {
  BORRADOR_INICIAL,
  PREFERENCIAS_DRAFT_KEY,
} from "../../../config/preferencias";
import type {
  PreferenciasFormValues,
  UnidadDuracion,
} from "../../../types/preferencias";

const UNIDADES: readonly UnidadDuracion[] = ["horas", "dias"];

function numeroSeguro(valor: unknown, porDefecto: number): number {
  return typeof valor === "number" && Number.isFinite(valor)
    ? valor
    : porDefecto;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/** Normaliza un valor desconocido a un borrador válido, o `null` si no sirve. */
export function sanearBorrador(valor: unknown): PreferenciasFormValues | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return null;
  }

  const bruto = valor as Partial<PreferenciasFormValues>;

  // Ids enteros positivos y sin duplicados (el borrador puede venir editado a
  // mano); un `Set` evita crear la misma categoría dos veces al sincronizar.
  const categorias = Array.isArray(bruto.categorias)
    ? [
        ...new Set(
          bruto.categorias.filter(
            (id): id is number => Number.isInteger(id) && (id as number) > 0,
          ),
        ),
      ]
    : [];

  const unidad =
    typeof bruto.duracionUnidad === "string" &&
    (UNIDADES as readonly string[]).includes(bruto.duracionUnidad)
      ? (bruto.duracionUnidad as UnidadDuracion)
      : BORRADOR_INICIAL.duracionUnidad;

  return {
    categorias,
    presupuestoBob: numeroSeguro(
      bruto.presupuestoBob,
      BORRADOR_INICIAL.presupuestoBob,
    ),
    duracionValor: numeroSeguro(
      bruto.duracionValor,
      BORRADOR_INICIAL.duracionValor,
    ),
    duracionUnidad: unidad,
    latitud: texto(bruto.latitud),
    longitud: texto(bruto.longitud),
  };
}

/** Lee el borrador guardado; `null` si no hay o está corrupto. */
export function leerBorradorLocal(): PreferenciasFormValues | null {
  try {
    const crudo = localStorage.getItem(PREFERENCIAS_DRAFT_KEY);

    if (!crudo) {
      return null;
    }

    return sanearBorrador(JSON.parse(crudo));
  } catch {
    // JSON inválido o almacenamiento no disponible: se ignora.
    return null;
  }
}

/** Guarda el borrador. Si el almacenamiento falla, la copia en memoria sigue. */
export function escribirBorradorLocal(valores: PreferenciasFormValues): void {
  try {
    localStorage.setItem(PREFERENCIAS_DRAFT_KEY, JSON.stringify(valores));
  } catch {
    // Cuota agotada o modo privado: no es un error fatal del formulario.
  }
}

/** Elimina el borrador guardado. */
export function borrarBorradorLocal(): void {
  try {
    localStorage.removeItem(PREFERENCIAS_DRAFT_KEY);
  } catch {
    // noop
  }
}
