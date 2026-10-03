/**
 * Cliente del CRUD de destinos (`AtractivoAdminViewSet`) sobre el `api` de
 * axios ya configurado (interceptor de JWT + refresh en `src/api/http.ts`).
 *
 * Contrato verificado contra el backend en vivo, sin necesidad de tocarlo:
 *
 * - `GET    /api/turismo/admin/atractivos/`      → 200, paginado, **incluye
 *   los dados de baja** (`activo=false`), que el catálogo público oculta.
 * - `POST   /api/turismo/admin/atractivos/`      → 201, cuerpo completo.
 * - `PATCH  /api/turismo/admin/atractivos/:id/`  → 200, cuerpo completo.
 * - `DELETE /api/turismo/admin/atractivos/:id/`  → 204. Es una **baja lógica**
 *   (`activo=false`): la fila sobrevive con sus horarios y tarifas, y el
 *   destino desaparece del catálogo público. Por eso el panel ofrece también
 *   "reactivar", que es un `PATCH {"activo": true}`.
 *
 * Todos exigen rol ADMIN (`IsAdmin`); el backend responde 403 al resto.
 *
 * Detalles del contrato que condicionan este módulo:
 *
 * 1. `categorias` viaja como **ids** (`Categoria.id_categoria`), no nombres.
 * 2. `ubicacion` es obligatoria y se recibe como `{longitud, latitud}`.
 * 3. `duracion_minutos` no tiene `min_value` en el serializer pero sí un CHECK
 *   `> 0` en Postgres: mandar `0` produce un 500, no un 400. Este cliente
 *    nunca envía `0` (ver `aPayload`).
 * 4. Con `DEBUG=True` un error 500 llega como HTML con el traceback, no como
 *    JSON. `aDestinosAdminError` lo detecta para no intentar parsearlo.
 */

import { api } from "../../../../api/http";
import {
  ADMIN_DESTINOS_PAGE_SIZE,
  DURACION_MIN_MINUTOS,
  TURISMO_ENDPOINTS,
} from "../../../../config/turismo";
import type {
  AtractivoAdmin,
  AtractivoAdminInput,
  Paginado,
} from "../../../../types/turismo";

/**
 * Campos del formulario, con los nombres que usa `DestinoFormValues`.
 *
 * No coinciden con los del serializer: `duracion_minutos` es
 * `duracionMinutos` y `ubicacion` se parte en `longitud` y `latitud`. El
 * mapeo se centraliza en `aPayload` y `CAMPO_A_FORMULARIO` para que las dos
 * direcciones no se desincronicen.
 */
export type CampoFormulario =
  | "nombre"
  | "descripcion"
  | "direccion"
  | "duracionMinutos"
  | "longitud"
  | "latitud"
  | "categorias"
  | "fuenteOrigen"
  | "activo";

/**
 * Traduce una clave del serializer al campo equivalente del formulario.
 *
 * Los errores de `ubicacion` se asignan a `longitud`, que es el primer input
 * del par, para que el mensaje siempre sea visible.
 *
 * `detail` y `non_field_errors` **no** aparecen aquí a propósito: no señalan
 * ningún campo en concreto (por ejemplo, un 403 de permisos o un fallo de
 * autenticación), así que se tratan como mensaje global. Si se mapearan a un
 * campo, un "No tenés permiso para esta acción" aparecería bajo el nombre del
 * destino, como si el problema fuera ese campo y no los permisos.
 */
const CAMPO_A_FORMULARIO: Record<string, CampoFormulario> = {
  nombre: "nombre",
  descripcion: "descripcion",
  direccion: "direccion",
  duracion_minutos: "duracionMinutos",
  ubicacion: "longitud",
  categorias: "categorias",
  fuente_origen: "fuenteOrigen",
  activo: "activo",
};

/**
 * Error del panel de destinos con los mensajes por campo que devuelve Django.
 *
 * `erroresPorCampo` viene vacío cuando el fallo no es de validación (red,
 * 401, 403, 500…), y en ese caso solo hay `mensaje`.
 */
export class DestinosAdminApiError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
    erroresPorCampo: Partial<Record<CampoFormulario, string[]>> = {},
  ) {
    super(message);
    this.name = "DestinosAdminApiError";
    this.status = status;
    this.erroresPorCampo = erroresPorCampo;
  }

  readonly erroresPorCampo: Partial<Record<CampoFormulario, string[]>>;

  /** El backend rechazó algún valor: hay que revisar el formulario. */
  get esValidacion(): boolean {
    return Object.keys(this.erroresPorCampo).length > 0;
  }

  /** Sin sesión ADMIN válida. El interceptor de `http.ts` ya refrescó. */
  get esNoAutorizado(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** El servidor falló al escribir (violación de CHECK, BD caída…). */
  get esErrorServidor(): boolean {
    return this.status >= 500;
  }

  /** Mensajes de un campo concreto, listo para pintar bajo el input. */
  mensajesDe(campo: CampoFormulario): string[] {
    return this.erroresPorCampo[campo] ?? [];
  }
}

/** Convierte un valor de error de DRF en una lista de mensajes. */
function aListaMensajes(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.filter((v): v is string => typeof v === "string");
  }

  if (typeof valor === "string") {
    return [valor];
  }

  // `{"ubicacion": {"longitud": ["..."]}}`: DRF anida los errores de un
  // `serializers.Field` compuesto. Se aplana para no perder el mensaje.
  if (valor && typeof valor === "object") {
    return Object.values(valor as Record<string, unknown>).flatMap(aListaMensajes);
  }

  return [];
}

/** Normaliza cualquier error de axios a `DestinosAdminApiError`. */
export function aDestinosAdminError(
  error: unknown,
  porDefecto: string,
): DestinosAdminApiError {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return new DestinosAdminApiError(
      error instanceof Error ? error.message : porDefecto,
      0,
    );
  }

  const respuesta = (error as { response?: { status?: number; data?: unknown } })
    .response;

  const status = respuesta?.status ?? 0;
  const datos = respuesta?.data;

  // El body llega como texto cuando Django devuelve su página de error HTML.
  const esJson =
    datos !== null &&
    typeof datos === "object" &&
    !Array.isArray(datos);

  const porCampo: Partial<Record<CampoFormulario, string[]>> = {};
  let mensaje = porDefecto;

  if (esJson) {
    for (const [clave, valor] of Object.entries(
      datos as Record<string, unknown>,
    )) {
      const campo = CAMPO_A_FORMULARIO[clave];

      if (!campo) {
        continue;
      }

      const lista = aListaMensajes(valor);

      if (lista.length > 0) {
        porCampo[campo] = [...(porCampo[campo] ?? []), ...lista];
      }
    }

    const primero = Object.values(porCampo)[0]?.[0];

    if (primero) {
      mensaje = primero;
    } else if (typeof (datos as { detail?: unknown }).detail === "string") {
      mensaje = (datos as { detail: string }).detail;
    }
  } else if (typeof datos === "string" && datos.trim().length > 0) {
    // 500 con traceback HTML: no se muestra el HTML, solo un aviso claro.
    mensaje =
      status >= 500
        ? "El servidor no pudo guardar el cambio. Revisá los datos e intentá de nuevo."
        : datos;
  }

  return new DestinosAdminApiError(mensaje, status, porCampo);
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

/**
 * Convierte el formulario en el cuerpo que espera el serializer.
 *
 * Se llama **después** de `validarFormulario`, así que los números ya son
 * válidos. Aun así sanea dos cosas en lugar de confiar en eso:
 *
 * - `duracionMinutos` vacío o `<= 0` → `null`. Mandar `0` dispara el CHECK
 *   `duracion_minutos > 0` de Postgres y el backend contesta 500 en vez de
 *   un 400, así que es un valor que jamás debe salir del formulario.
 * - `longitud`/`latitud` caen a `0` si vinieran no numéricas. Es un valor
 *   válido para el backend (0,0 está en el océano, no en La Paz, pero no
 *   rompe) y evita mandar un `NaN`, que `JSON.stringify` convertiría en
 *   `null` sin avisar.
 */
export function aPayload(valores: {
  nombre: string;
  descripcion: string;
  direccion: string;
  duracionMinutos: string;
  longitud: string;
  latitud: string;
  categorias: number[];
  fuenteOrigen: string;
  activo: boolean;
}): AtractivoAdminInput {
  const duracion = Number(valores.duracionMinutos.trim());
  const sinDuracion =
    valores.duracionMinutos.trim() === "" ||
    !Number.isFinite(duracion) ||
    duracion < DURACION_MIN_MINUTOS;

  return {
    nombre: valores.nombre.trim(),
    descripcion: valores.descripcion.trim(),
    direccion: valores.direccion.trim() || null,
    duracion_minutos: sinDuracion ? null : Math.trunc(duracion),
    ubicacion: {
      longitud: aCoordenada(valores.longitud),
      latitud: aCoordenada(valores.latitud),
    },
    categorias: [...new Set(valores.categorias)],
    fuente_origen: valores.fuenteOrigen.trim(),
    activo: valores.activo,
  };
}

/** Texto del input a número, tolerando coma decimal. `0` si no es número. */
function aCoordenada(texto: string): number {
  const valor = Number(texto.trim().replace(",", "."));

  return Number.isFinite(valor) ? valor : 0;
}

/** Normaliza un `AtractivoAdmin` para tolerar ids y números raro. */
function normalizar(atractivo: AtractivoAdmin): AtractivoAdmin {
  const duracion = Number(atractivo.duracion_minutos);

  return {
    ...atractivo,
    id_atractivo: String(atractivo.id_atractivo ?? ""),
    nombre: atractivo.nombre ?? "Destino sin nombre",
    descripcion: atractivo.descripcion ?? "",
    direccion: atractivo.direccion ?? null,
    duracion_minutos: Number.isFinite(duracion) && duracion > 0 ? duracion : null,
    ubicacion: atractivo.ubicacion ?? null,
    categorias: Array.isArray(atractivo.categorias) ? atractivo.categorias : [],
    activo: atractivo.activo !== false,
  };
}

/** GET /api/turismo/admin/atractivos/ — incluye los dados de baja. */
export async function listarDestinos(pagina = 1): Promise<Paginado<AtractivoAdmin>> {
  try {
    const { data } = await api.get(TURISMO_ENDPOINTS.atractivoAdminList, {
      params: { page: pagina, page_size: ADMIN_DESTINOS_PAGE_SIZE },
    });

    const resultado = normalizarPagina<AtractivoAdmin>(data);

    return { ...resultado, results: resultado.results.map(normalizar) };
  } catch (error) {
    throw aDestinosAdminError(
      error,
      "No pudimos cargar los destinos. Revisá tu sesión e intentá de nuevo.",
    );
  }
}

/** GET /api/turismo/admin/atractivos/:id/ */
export async function obtenerDestino(id: string): Promise<AtractivoAdmin> {
  try {
    const { data } = await api.get<AtractivoAdmin>(
      TURISMO_ENDPOINTS.atractivoAdminDetalle(id),
    );

    return normalizar(data);
  } catch (error) {
    throw aDestinosAdminError(
      error,
      "No pudimos cargar el destino que querés editar.",
    );
  }
}

/** POST /api/turismo/admin/atractivos/ */
export async function crearDestino(
  payload: AtractivoAdminInput,
): Promise<AtractivoAdmin> {
  try {
    const { data } = await api.post<AtractivoAdmin>(
      TURISMO_ENDPOINTS.atractivoAdminList,
      payload,
    );

    return normalizar(data);
  } catch (error) {
    throw aDestinosAdminError(
      error,
      "No pudimos crear el destino. Revisá los datos e intentá de nuevo.",
    );
  }
}

/** PATCH /api/turismo/admin/atractivos/:id/ */
export async function actualizarDestino(
  id: string,
  payload: AtractivoAdminInput,
): Promise<AtractivoAdmin> {
  try {
    const { data } = await api.patch<AtractivoAdmin>(
      TURISMO_ENDPOINTS.atractivoAdminDetalle(id),
      payload,
    );

    return normalizar(data);
  } catch (error) {
    throw aDestinosAdminError(
      error,
      "No pudimos guardar los cambios. Revisá los datos e intentá de nuevo.",
    );
  }
}

/**
 * DELETE /api/turismo/admin/atractivos/:id/ — **baja lógica**.
 *
 * Devuelve 204 sin cuerpo. El destino pasa a `activo=false`: sale del
 * catálogo público pero conserva horarios, tarifas e historial, y se puede
 * reactivar después.
 */
export async function darDeBajaDestino(id: string): Promise<void> {
  try {
    await api.delete(TURISMO_ENDPOINTS.atractivoAdminDetalle(id));
  } catch (error) {
    throw aDestinosAdminError(
      error,
      "No pudimos dar de baja el destino. Intentá de nuevo.",
    );
  }
}

/** Reactiva un destino dado de baja: `PATCH {"activo": true}`. */
export async function reactivarDestino(id: string): Promise<AtractivoAdmin> {
  try {
    const { data } = await api.patch<AtractivoAdmin>(
      TURISMO_ENDPOINTS.atractivoAdminDetalle(id),
      { activo: true },
    );

    return normalizar(data);
  } catch (error) {
    throw aDestinosAdminError(
      error,
      "No pudimos reactivar el destino. Intentá de nuevo.",
    );
  }
}

export const destinosAdminApi = {
  listarDestinos,
  obtenerDestino,
  crearDestino,
  actualizarDestino,
  darDeBajaDestino,
  reactivarDestino,
};