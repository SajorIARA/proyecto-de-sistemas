/**
 * Cliente HTTP del panel de fuentes: **solo** llama al backend.
 *
 * El navegador nunca contacta a Overpass, Wikidata ni Google. El backend
 * aplica `IsAdmin` y devuelve 403 a cualquier otro rol, incluso si la UI se
 * montara por error (ver `RoleRoute` y `enabled: esAdmin` en los hooks).
 */

import { api } from "../../../../api/http";
import { CONOCIMIENTO_ENDPOINTS } from "../../../../config/conocimiento";
import type {
  CrearImportacionInput,
  ImportacionLugares,
  LugarCandidato,
  ResultadoAprobacion,
  ResultadoVectorizacion,
} from "../../../../types/conocimiento";

export type CampoImportacion =
  | "consulta"
  | "ciudad"
  | "fuentes"
  | "limite"
  | "categoria"
  | "duracion_minutos";

const CAMPOS: readonly string[] = [
  "consulta",
  "ciudad",
  "fuentes",
  "limite",
  "categoria",
  "duracion_minutos",
];

export class ImportacionesAdminApiError extends Error {
  readonly status: number;
  readonly erroresPorCampo: Partial<Record<CampoImportacion, string[]>>;

  constructor(
    message: string,
    status: number,
    erroresPorCampo: Partial<Record<CampoImportacion, string[]>> = {},
  ) {
    super(message);
    this.name = "ImportacionesAdminApiError";
    this.status = status;
    this.erroresPorCampo = erroresPorCampo;
  }

  get esNoAutorizado(): boolean {
    return this.status === 401 || this.status === 403;
  }

  mensajesDe(campo: CampoImportacion): string[] {
    return this.erroresPorCampo[campo] ?? [];
  }
}

function aListaMensajes(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.filter((item): item is string => typeof item === "string");
  }
  return typeof valor === "string" ? [valor] : [];
}

export function aImportacionesAdminError(
  error: unknown,
  porDefecto: string,
): ImportacionesAdminApiError {
  const respuesta = (
    error as { response?: { status?: number; data?: unknown } } | null
  )?.response;
  const status = respuesta?.status ?? 0;
  const datos = respuesta?.data;

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return new ImportacionesAdminApiError(
      error instanceof Error ? error.message : porDefecto,
      status,
    );
  }

  const erroresPorCampo: Partial<Record<CampoImportacion, string[]>> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (!CAMPOS.includes(clave)) {
      continue;
    }
    const mensajes = aListaMensajes(valor);
    if (mensajes.length > 0) {
      erroresPorCampo[clave as CampoImportacion] = mensajes;
    }
  }

  const primero = Object.values(erroresPorCampo)[0]?.[0];
  const detail = (datos as { detail?: unknown }).detail;
  const mensaje =
    primero ??
    (typeof detail === "string" ? detail : undefined) ??
    porDefecto;

  return new ImportacionesAdminApiError(mensaje, status, erroresPorCampo);
}

function normalizarLista<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/** GET /api/conocimiento/admin/importaciones/ */
export async function listarImportaciones(
  signal?: AbortSignal,
): Promise<ImportacionLugares[]> {
  try {
    const { data } = await api.get(
      CONOCIMIENTO_ENDPOINTS.importaciones,
      { signal },
    );
    return normalizarLista<ImportacionLugares>(data);
  } catch (error) {
    throw aImportacionesAdminError(
      error,
      "No pudimos cargar las importaciones. Revisá tu sesión e intentá de nuevo.",
    );
  }
}

/** POST /api/conocimiento/admin/importaciones/ */
export async function crearImportacion(
  payload: CrearImportacionInput,
): Promise<ImportacionLugares> {
  try {
    const { data } = await api.post<ImportacionLugares>(
      CONOCIMIENTO_ENDPOINTS.importaciones,
      payload,
    );
    return data;
  } catch (error) {
    throw aImportacionesAdminError(
      error,
      "No pudimos iniciar la importación. Intentá de nuevo.",
    );
  }
}

/** GET /api/conocimiento/admin/importaciones/:id/candidatos/ */
export async function obtenerCandidatos(
  idImportacion: string,
  signal?: AbortSignal,
): Promise<LugarCandidato[]> {
  try {
    const { data } = await api.get(
      CONOCIMIENTO_ENDPOINTS.candidatos(idImportacion),
      { signal },
    );
    return normalizarLista<LugarCandidato>(data);
  } catch (error) {
    throw aImportacionesAdminError(
      error,
      "No pudimos cargar los candidatos de esta importación.",
    );
  }
}

/** POST /api/conocimiento/admin/candidatos/:id/aprobar/ */
export async function aprobarCandidato(
  idCandidato: string,
  payload: { categoria: string; duracion_minutos: number },
): Promise<ResultadoAprobacion> {
  try {
    const { data } = await api.post<ResultadoAprobacion>(
      CONOCIMIENTO_ENDPOINTS.aprobar(idCandidato),
      payload,
    );
    return data;
  } catch (error) {
    throw aImportacionesAdminError(
      error,
      "No pudimos aprobar el candidato. Revisá la categoría y la duración.",
    );
  }
}

/** POST /api/conocimiento/admin/candidatos/:id/rechazar/ */
export async function rechazarCandidato(
  idCandidato: string,
  notas: string,
): Promise<LugarCandidato> {
  try {
    const { data } = await api.post<LugarCandidato>(
      CONOCIMIENTO_ENDPOINTS.rechazar(idCandidato),
      { notas },
    );
    return data;
  } catch (error) {
    throw aImportacionesAdminError(
      error,
      "No pudimos rechazar el candidato. Intentá de nuevo.",
    );
  }
}

/** POST /api/conocimiento/admin/importaciones/:id/vectorizar/ */
export async function vectorizarImportacion(
  idImportacion: string,
): Promise<ResultadoVectorizacion> {
  try {
    const { data } = await api.post<ResultadoVectorizacion>(
      CONOCIMIENTO_ENDPOINTS.vectorizar(idImportacion),
    );
    return data;
  } catch (error) {
    throw aImportacionesAdminError(
      error,
      "No pudimos encolar la vectorización. Intentá de nuevo.",
    );
  }
}

export const importacionesAdminApi = {
  listarImportaciones,
  crearImportacion,
  obtenerCandidatos,
  aprobarCandidato,
  rechazarCandidato,
  vectorizarImportacion,
};
