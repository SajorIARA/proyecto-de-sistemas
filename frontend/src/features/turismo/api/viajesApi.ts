/**
 * Cliente de los viajes persistidos del usuario (`/api/viajes/`).
 *
 * El interceptor de `api/http.ts` adjunta el JWT, así que todas las rutas
 * exigen sesión sin trabajo adicional. El listado viene paginado por DRF;
 * se recorren todas las páginas para que «Mis viajes» no pierda los que
 * queden fuera de la primera.
 */

import { api } from "../../../api/http";
import {
  VIAJES_ENDPOINTS,
  VIAJES_MAX_PAGINAS,
} from "../../../config/viajes";

export type EstadoViaje = "planificado" | "en_curso" | "finalizado";

export interface ParadaViaje {
  id: number;
  atractivo: string;
  nombre: string;
  orden: number;
  visitada: boolean;
  visitada_en: string | null;
}

export interface ViajeBackend {
  id: string;
  nombre: string;
  estado: EstadoViaje;
  creado_en: string;
  actualizado_en: string;
  iniciado_en: string | null;
  finalizado_en: string | null;
  paradas: ParadaViaje[];
}

export interface ViajeInput {
  nombre: string;
  /** UUIDs de `Atractivo`, en el orden deseado. */
  paradas: string[];
}

interface PaginaViajes {
  count: number;
  next: string | null;
  results: ViajeBackend[];
}

function normalizarPagina(data: unknown): PaginaViajes {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, results: data as ViajeBackend[] };
  }
  const objeto = (data ?? {}) as Partial<PaginaViajes>;
  return {
    count: typeof objeto.count === "number" ? objeto.count : 0,
    next: objeto.next ?? null,
    results: Array.isArray(objeto.results) ? objeto.results : [],
  };
}

export async function listarViajes(): Promise<ViajeBackend[]> {
  const todos: ViajeBackend[] = [];
  let pagina = 1;

  while (pagina <= VIAJES_MAX_PAGINAS) {
    const { data } = await api.get(VIAJES_ENDPOINTS.listar, {
      params: { page: pagina, page_size: 100 },
    });
    const lote = normalizarPagina(data);
    todos.push(...lote.results);
    if (!lote.next || lote.results.length === 0) break;
    pagina += 1;
  }

  return todos;
}

export async function crearViaje(datos: ViajeInput): Promise<ViajeBackend> {
  const { data } = await api.post<ViajeBackend>(VIAJES_ENDPOINTS.listar, datos);
  return data;
}

export async function actualizarViaje(
  id: string,
  datos: Partial<ViajeInput>,
): Promise<ViajeBackend> {
  const { data } = await api.patch<ViajeBackend>(
    VIAJES_ENDPOINTS.detalle(id),
    datos,
  );
  return data;
}

export async function eliminarViaje(id: string): Promise<void> {
  await api.delete(VIAJES_ENDPOINTS.detalle(id));
}

export async function iniciarViaje(id: string): Promise<ViajeBackend> {
  const { data } = await api.post<ViajeBackend>(VIAJES_ENDPOINTS.iniciar(id));
  return data;
}

export async function finalizarViaje(id: string): Promise<ViajeBackend> {
  const { data } = await api.post<ViajeBackend>(VIAJES_ENDPOINTS.finalizar(id));
  return data;
}

export async function marcarVisitada(
  id: string,
  paradaId: number,
  visitada: boolean,
): Promise<ViajeBackend> {
  const { data } = await api.post<ViajeBackend>(
    VIAJES_ENDPOINTS.visitada(id, paradaId),
    { visitada },
  );
  return data;
}
