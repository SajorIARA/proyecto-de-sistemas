/**
 * Cliente HTTP del motor de recomendación.
 *
 * Usa el `api` de axios ya configurado (interceptor de JWT + refresh en
 * `src/api/http.ts`), así que `POST /api/recomendaciones/recomendar/` exige
 * sesión sin trabajo extra.
 *
 * El backend devuelve `DecimalField` como texto (`costo_bob: "35.00"`), por
 * eso cada ítem se normaliza a números antes de llegar a la UI. También se
 * ordena por `puntaje` de forma descendente aunque el servidor ya lo hace:
 * la pantalla promete el Top-K ordenado por coincidencia.
 */

import axios from "axios";
import { api } from "../../../api/http";
import { RECOMENDACIONES_ENDPOINTS } from "../../../config/recomendaciones";
import type {
  Recomendacion,
  RecomendacionInput,
  RespuestaRecomendaciones,
} from "../../../types/recomendaciones";

const MENSAJE_POR_DEFECTO =
  "No pudimos calcular tus recomendaciones. Inténtalo de nuevo.";

export class RecomendacionesApiError extends Error {
  readonly status: number;

  readonly erroresPorCampo: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    erroresPorCampo: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "RecomendacionesApiError";
    this.status = status;
    this.erroresPorCampo = erroresPorCampo;
  }

  /** Mensajes de un campo concreto; vacío si el backend no mandó ninguno. */
  mensajesDe(campo: string): string[] {
    return this.erroresPorCampo[campo] ?? [];
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** DRF manda `string[]`; se toleran `string` sueltos y objetos anidados. */
function aMensajes(valor: unknown): string[] {
  if (typeof valor === "string") {
    return [valor];
  }

  if (Array.isArray(valor)) {
    return valor.flatMap((entrada) => aMensajes(entrada));
  }

  return [];
}

function mensajePorStatus(status: number): string {
  if (status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (status === 403) return "Tu cuenta no tiene permisos para esta consulta.";
  if (status === 400) return "Revisa el perfil de búsqueda e inténtalo de nuevo.";
  if (status === 429) {
    return "Hiciste muchas consultas seguidas. Espera un momento y reintenta.";
  }
  if (status >= 500) return "El servicio de recomendaciones no está disponible.";

  return MENSAJE_POR_DEFECTO;
}

/** Traduce un error de axios a `RecomendacionesApiError` (idempotente). */
export function aRecomendacionesApiError(
  error: unknown,
): RecomendacionesApiError {
  if (error instanceof RecomendacionesApiError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return new RecomendacionesApiError(MENSAJE_POR_DEFECTO, 0);
  }

  const status = error.response?.status ?? 0;
  const cuerpo = error.response?.data;

  if (esObjeto(cuerpo)) {
    const erroresPorCampo: Record<string, string[]> = {};

    for (const [clave, valor] of Object.entries(cuerpo)) {
      const mensajes = aMensajes(valor);

      if (mensajes.length > 0) {
        erroresPorCampo[clave] = mensajes;
      }
    }

    const global = aMensajes(cuerpo.detail)[0] ?? aMensajes(cuerpo.message)[0];

    if (global || Object.keys(erroresPorCampo).length > 0) {
      const titular =
        global ??
        erroresPorCampo["non_field_errors"]?.[0] ??
        Object.values(erroresPorCampo)[0]?.[0] ??
        MENSAJE_POR_DEFECTO;

      return new RecomendacionesApiError(titular, status, erroresPorCampo);
    }
  }

  return new RecomendacionesApiError(mensajePorStatus(status), status);
}

function aNumero(valor: unknown, porDefecto = 0): number {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : porDefecto;
}

function aCategorias(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === "string")
    : [];
}

function aMotivos(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === "string")
    : [];
}

/** Normaliza un ítem del Top-K, tolerando decimales serializados como texto. */
export function normalizarRecomendacion(
  entrada: Recomendacion,
): Recomendacion {
  return {
    id_atractivo: String(entrada.id_atractivo ?? ""),
    nombre: entrada.nombre ?? "Destino sin nombre",
    puntaje: aNumero(entrada.puntaje),
    afinidad_categoria: aNumero(entrada.afinidad_categoria),
    proximidad: aNumero(entrada.proximidad),
    holgura_presupuesto: aNumero(entrada.holgura_presupuesto),
    holgura_tiempo: aNumero(entrada.holgura_tiempo),
    distancia_km: aNumero(entrada.distancia_km),
    factor_penalizacion: aNumero(entrada.factor_penalizacion, 1),
    viable: Boolean(entrada.viable),
    motivos: aMotivos(entrada.motivos),
    categorias: aCategorias(entrada.categorias),
    costo_bob: aNumero(entrada.costo_bob),
    duracion_horas: aNumero(entrada.duracion_horas),
    latitud: aNumero(entrada.latitud),
    longitud: aNumero(entrada.longitud),
  };
}

/** Orden estable: puntaje descendente, cercanía e id como desempate. */
function ordenarTopK(recomendaciones: Recomendacion[]): Recomendacion[] {
  return [...recomendaciones].sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      a.distancia_km - b.distancia_km ||
      a.id_atractivo.localeCompare(b.id_atractivo),
  );
}

/** POST /api/recomendaciones/recomendar/ → Top-K ordenado por afinidad. */
export async function recomendarPerfil(
  entrada: RecomendacionInput,
): Promise<RespuestaRecomendaciones> {
  try {
    const { data } = await api.post<RespuestaRecomendaciones>(
      RECOMENDACIONES_ENDPOINTS.recomendar,
      entrada,
    );

    const recomendaciones = Array.isArray(data?.recomendaciones)
      ? data.recomendaciones.map(normalizarRecomendacion)
      : [];

    return {
      id_consulta: data?.id_consulta ?? null,
      generado_en: data?.generado_en ?? new Date().toISOString(),
      total_activos: aNumero(data?.total_activos),
      total_evaluados: aNumero(data?.total_evaluados),
      total_recomendaciones: recomendaciones.length,
      radio_km: aNumero(data?.radio_km, entrada.radio_km ?? 15),
      top_k: aNumero(data?.top_k, entrada.top_k ?? 10),
      recomendaciones: ordenarTopK(recomendaciones),
    };
  } catch (error) {
    throw aRecomendacionesApiError(error);
  }
}

export const recomendacionesApi = {
  recomendarPerfil,
};
