/**
 * Cliente HTTP de las preferencias y restricciones del turista.
 *
 * Usa el `api` de axios ya configurado (interceptor de JWT + refresh en
 * `src/api/http.ts`), así que las tres rutas exigen sesión sin trabajo extra:
 *
 * - `GET/POST /api/preferences/` y `PATCH/DELETE /api/preferences/:id/`
 *   (`MisPreferenciasViewSet`): el backend asigna el usuario desde el JWT.
 * - `POST /api/recomendaciones/consultas/` (`ConsultaRecomendacionViewSet`):
 *   guarda las restricciones duras del recorrido.
 *
 * `PreferenciasApiError` conserva el status y los mensajes **por campo** que
 * devuelve DRF, porque el formulario los pinta debajo de cada control.
 */

import axios from "axios";
import { api } from "../../../api/http";
import { PREFERENCIAS_ENDPOINTS } from "../../../config/preferencias";
import type {
  ConsultaInput,
  ConsultaRecomendacion,
  PreferenciaInput,
  PreferenciaUsuario,
} from "../../../types/preferencias";
import type { Paginado } from "../../../types/turismo";

const MENSAJE_POR_DEFECTO =
  "No pudimos guardar tus preferencias. Inténtalo de nuevo.";

export class PreferenciasApiError extends Error {
  readonly status: number;

  readonly erroresPorCampo: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    erroresPorCampo: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "PreferenciasApiError";
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
  if (status === 403) return "Tu cuenta no tiene permisos para esta acción.";
  if (status === 400) return "Revisa los datos marcados en rojo.";
  if (status === 429) {
    return "Demasiados intentos. Espera un momento antes de reintentar.";
  }
  if (status >= 500) return "El servicio no está disponible en este momento.";

  return MENSAJE_POR_DEFECTO;
}

/** Traduce un error de axios a `PreferenciasApiError` (idempotente). */
export function aPreferenciasApiError(error: unknown): PreferenciasApiError {
  if (error instanceof PreferenciasApiError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return new PreferenciasApiError(MENSAJE_POR_DEFECTO, 0);
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

    const global =
      aMensajes(cuerpo.detail)[0] ?? aMensajes(cuerpo.message)[0];

    if (global || Object.keys(erroresPorCampo).length > 0) {
      const titular =
        global ??
        erroresPorCampo["non_field_errors"]?.[0] ??
        Object.values(erroresPorCampo)[0]?.[0] ??
        MENSAJE_POR_DEFECTO;

      return new PreferenciasApiError(titular, status, erroresPorCampo);
    }
  }

  return new PreferenciasApiError(mensajePorStatus(status), status);
}

/** Normaliza la respuesta paginada de DRF (y tolera un array plano). */
function normalizarPagina<T>(data: unknown): Paginado<T> {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }

  const objeto = (data ?? {}) as Partial<Paginado<T>>;

  return {
    count: typeof objeto.count === "number" ? objeto.count : 0,
    next: objeto.next ?? null,
    previous: objeto.previous ?? null,
    results: Array.isArray(objeto.results) ? objeto.results : [],
  };
}

/** Convierte el id de categoría a número, tolerando strings del backend. */
function aNumero(valor: unknown, porDefecto = 0): number {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : porDefecto;
}

/** GET /api/preferences/ → preferencias propias del usuario en sesión. */
export async function listarMisPreferencias(): Promise<PreferenciaUsuario[]> {
  try {
    const { data } = await api.get(PREFERENCIAS_ENDPOINTS.misPreferencias);

    return normalizarPagina<PreferenciaUsuario>(data).results.map(
      (preferencia) => ({
        ...preferencia,
        id: aNumero(preferencia.id),
        categoria: aNumero(preferencia.categoria),
      }),
    );
  } catch (error) {
    throw aPreferenciasApiError(error);
  }
}

async function crearPreferencia(
  entrada: PreferenciaInput,
): Promise<PreferenciaUsuario> {
  const { data } = await api.post<PreferenciaUsuario>(
    PREFERENCIAS_ENDPOINTS.misPreferencias,
    {
      categoria: entrada.categoria,
      nivel_interes: entrada.nivel_interes ?? "1.00",
    },
  );

  return data;
}

async function eliminarPreferencia(id: number): Promise<void> {
  await api.delete(PREFERENCIAS_ENDPOINTS.preferenciaDetalle(id));
}

/**
 * Deja `/api/preferences/` exactamente con las categorías seleccionadas.
 *
 * El backend guarda una fila por (usuario, categoría), así que la
 * sincronización calcula el diff contra lo que ya existe:
 *
 * - Categorías nuevas → `POST`.
 * - Categorías quitadas → `DELETE`.
 * - Categorías que siguen → no se tocan (no se pierde su `nivel_interes`).
 */
export async function sincronizarPreferencias(
  categorias: number[],
): Promise<PreferenciaUsuario[]> {
  try {
    const existentes = await listarMisPreferencias();
    const seleccionadas = new Set(categorias);

    const aEliminar = existentes.filter(
      (preferencia) => !seleccionadas.has(preferencia.categoria),
    );
    const yaExisten = new Set(existentes.map((p) => p.categoria));
    const aCrear = categorias.filter((id) => !yaExisten.has(id));

    await Promise.all([
      ...aEliminar.map((preferencia) => eliminarPreferencia(preferencia.id)),
      ...aCrear.map((categoria) => crearPreferencia({ categoria })),
    ]);

    return await listarMisPreferencias();
  } catch (error) {
    throw aPreferenciasApiError(error);
  }
}

/** POST /api/recomendaciones/consultas/ → restricciones duras del recorrido. */
export async function crearConsulta(
  entrada: ConsultaInput,
): Promise<ConsultaRecomendacion> {
  try {
    const { data } = await api.post<ConsultaRecomendacion>(
      PREFERENCIAS_ENDPOINTS.consultas,
      entrada,
    );

    return data;
  } catch (error) {
    throw aPreferenciasApiError(error);
  }
}

export interface GuardarPerfilInput {
  categorias: number[];
  /** `null` cuando el turista no definió un punto de partida todavía. */
  consulta: ConsultaInput | null;
}

export interface GuardarPerfilResultado {
  preferencias: PreferenciaUsuario[];
  consulta: ConsultaRecomendacion | null;
}

/**
 * Guarda el perfil completo: primero sincroniza las categorías de interés y,
 * si hay punto de partida, registra la consulta con las restricciones duras.
 */
export async function guardarPerfil({
  categorias,
  consulta,
}: GuardarPerfilInput): Promise<GuardarPerfilResultado> {
  const preferencias = await sincronizarPreferencias(categorias);
  const consultaCreada = consulta ? await crearConsulta(consulta) : null;

  return { preferencias, consulta: consultaCreada };
}

export const preferenciasApi = {
  listarMisPreferencias,
  sincronizarPreferencias,
  crearConsulta,
  guardarPerfil,
};
