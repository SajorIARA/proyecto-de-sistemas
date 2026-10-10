/**
 * Cliente de subida y gestión de fotos de destinos (`FotoAdminViewSet`,
 * `FirmaFotoView`, `SubirFotoView`, `EstadoFotoView`). Solo ADMIN.
 *
 * Dos flujos conviven, tal como los diseñó el backend:
 *
 * 1. **Imágenes — subida directa firmada.** Se pide una firma al backend
 *    (`/fotos/firma/`), el navegador sube el archivo directo a Cloudinary
 *    con esa firma (el `api_secret` nunca sale del servidor) y, recién
 *    cuando Cloudinary confirma, se crea el registro `Foto` en la base con
 *    `estado = completed`. Es instantáneo y no usa Celery.
 *
 * 2. **Videos — multipart + Celery.** El archivo va al backend
 *    (`/fotos/subir/`), que responde 202 con una `Foto` en `pending` y
 *    encola la subida. Aquí se hace *polling* de `/fotos/<id>/estado/`
 *    hasta `completed` o `failed`.
 *
 * Detalle de implementación importante, verificado contra axios v1: con
 * `Content-Type: application/json` (el default de la instancia `api`), axios
 * convertiría el `FormData` a JSON. Por eso toda petición multipart fija
 * `Content-Type: multipart/form-data`, que además hace que el navegador
 * ponga el boundary correcto.
 */

import axios from "axios";
import { api } from "../../../../api/http";
import {
  CLOUDINARY_UPLOAD_BASE,
  FOTO_FORMATOS,
  FOTO_MAX_BYTES,
  TURISMO_ENDPOINTS,
} from "../../../../config/turismo";
import type {
  EstadoFoto,
  Foto,
  FotoInput,
  Paginado,
  TipoFoto,
} from "../../../../types/turismo";

/** Error de la capa de fotos con el status HTTP disponible. */
export class FotosAdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FotosAdminApiError";
    this.status = status;
  }

  /** El backend o Cloudinary rechazaron el archivo/intento. */
  get esValidacion(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /** Sin sesión ADMIN válida (el interceptor de `http.ts` ya refrescó). */
  get esNoAutorizado(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** Cloudinary no está configurado en el backend. */
  get esNoConfigurado(): boolean {
    return this.status === 503;
  }
}

/** Traduce cualquier error de axios a `FotosAdminApiError`. */
function aFotosError(error: unknown, porDefecto: string): FotosAdminApiError {
  if (error instanceof FotosAdminApiError) {
    return error;
  }

  if (!error || typeof error !== "object" || !("response" in error)) {
    return new FotosAdminApiError(
      error instanceof Error ? error.message : porDefecto,
      0,
    );
  }

  const respuesta = (error as { response?: { status?: number; data?: unknown } })
    .response;
  const status = respuesta?.status ?? 0;
  const datos = respuesta?.data;

  let mensaje = porDefecto;

  if (typeof datos === "string" && datos.trim() && status < 500) {
    mensaje = datos;
  } else if (datos && typeof datos === "object") {
    const detalle = (datos as { detail?: unknown }).detail;
    const errorCloud = (datos as { error?: { message?: unknown } }).error;

    if (typeof detalle === "string") {
      mensaje = detalle;
    } else if (typeof errorCloud?.message === "string") {
      // Respuesta de error nativa de Cloudinary.
      mensaje = errorCloud.message;
    }
  }

  return new FotosAdminApiError(mensaje, status);
}

/* ==========================================================================
   Helpers puros (probados en `fotosAdminApi.test.ts`)
   ========================================================================== */

const TIPOS_IMAGEN = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
const TIPOS_VIDEO = ["mp4", "mov", "webm", "m4v", "quicktime"];

/** Extensión en minúsculas, sin el punto. `""` si no tiene. */
export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto >= 0 ? nombre.slice(punto + 1).toLowerCase() : "";
}

/**
 * Tipo de medio del archivo: por MIME y, si falta, por extensión.
 * Devuelve `null` si no se puede clasificar (se rechaza).
 */
export function tipoDeArchivo(archivo: File): TipoFoto | null {
  const mime = (archivo.type || "").toLowerCase();

  if (mime.startsWith("image/")) {
    return "imagen";
  }

  if (mime.startsWith("video/")) {
    return "video";
  }

  const extension = extensionDe(archivo.name);

  if (TIPOS_IMAGEN.includes(extension)) {
    return "imagen";
  }

  if (TIPOS_VIDEO.includes(extension)) {
    return "video";
  }

  return null;
}

/**
 * Valida un archivo antes de subirlo. Devuelve el motivo del rechazo o
 * `null` si es aceptable. Replica lo que valida el backend/Cloudinary.
 */
export function validarArchivo(archivo: File): string | null {
  const tipo = tipoDeArchivo(archivo);

  if (tipo === null) {
    return `"${archivo.name}" no es una imagen ni un video compatible.`;
  }

  const extension = extensionDe(archivo.name);
  const permitidas = FOTO_FORMATOS[tipo] as readonly string[];

  if (!permitidas.includes(extension)) {
    return `"${archivo.name}": formato .${extension || "?"} no permitido. Usá ${permitidas.join(", ")}.`;
  }

  if (archivo.size > FOTO_MAX_BYTES[tipo]) {
    const mb = Math.round(FOTO_MAX_BYTES[tipo] / (1024 * 1024));
    return `"${archivo.name}" supera el máximo de ${mb} MB.`;
  }

  return null;
}

/** Normaliza un registro de foto para tolerar tipos laxos del backend. */
export function normalizarFoto(foto: Foto): Foto {
  return {
    ...foto,
    id_foto: Number(foto.id_foto),
    atractivo: String(foto.atractivo ?? ""),
    public_id: foto.public_id ?? "",
    url: foto.url ?? "",
    tipo: foto.tipo === "video" ? "video" : "imagen",
    estado: (foto.estado ?? "completed") as EstadoFoto,
    ancho: foto.ancho ?? null,
    alto: foto.alto ?? null,
    orden: Number(foto.orden ?? 0),
  };
}

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

/* ==========================================================================
   Llamadas al backend
   ========================================================================== */

export interface FirmaFoto {
  cloud_name: string;
  api_key: string;
  signature: string;
  timestamp: number;
  folder: string;
  allowed_formats: string[];
}

/**
 * POST /turismo/admin/fotos/firma/ — firma una subida directa.
 * 503 si Cloudinary no está configurado en el backend.
 */
export async function firmarFoto(entrada: {
  atractivo: string;
  formato: string;
  bytes: number;
}): Promise<FirmaFoto> {
  try {
    const { data } = await api.post<FirmaFoto>(
      TURISMO_ENDPOINTS.fotoFirma,
      entrada,
    );

    return data;
  } catch (error) {
    throw aFotosError(
      error,
      "No pudimos preparar la subida. Revisá la configuración de Cloudinary.",
    );
  }
}

/** GET /turismo/admin/fotos/ — todas las páginas de las fotos del destino. */
export async function listarFotosDe(atractivo: string): Promise<Foto[]> {
  const acumulado: Foto[] = [];
  let url: string | null = TURISMO_ENDPOINTS.fotosAdminList;
  let paginas = 0;

  try {
    while (url && paginas < 25) {
      const respuesta: { data: Foto[] | Paginado<Foto> } = await api.get(url, {
        params: url.includes("?")
          ? undefined
          : { atractivo, page_size: 100 },
      });

      const pagina = normalizarPagina<Foto>(respuesta.data);
      acumulado.push(...pagina.results.map(normalizarFoto));
      url = pagina.next;
      paginas += 1;
    }

    return acumulado;
  } catch (error) {
    throw aFotosError(error, "No pudimos cargar las fotos del destino.");
  }
}

/** POST /turismo/admin/fotos/ — persiste el registro tras subir directo. */
async function registrarFoto(input: FotoInput): Promise<Foto> {
  try {
    const { data } = await api.post<Foto>(
      TURISMO_ENDPOINTS.fotosAdminList,
      input,
    );

    return normalizarFoto(data);
  } catch (error) {
    throw aFotosError(error, "La imagen subió, pero no pudimos registrarla.");
  }
}

/** DELETE /turismo/admin/fotos/:id/ */
export async function eliminarFoto(id: number): Promise<void> {
  try {
    await api.delete(TURISMO_ENDPOINTS.fotoAdminDetalle(id));
  } catch (error) {
    throw aFotosError(error, "No pudimos eliminar la foto.");
  }
}

/** GET /turismo/admin/fotos/:id/estado/ */
export async function estadoFoto(id: number): Promise<{
  id_foto: number;
  estado: EstadoFoto;
  tipo: TipoFoto;
  url: string | null;
  public_id: string;
}> {
  try {
    const { data } = await api.get(TURISMO_ENDPOINTS.fotoEstado(id));

    return data;
  } catch (error) {
    throw aFotosError(error, "No pudimos consultar el estado de la subida.");
  }
}

/** GET /turismo/admin/fotos/:id/ — registro completo (tras completar). */
async function obtenerFoto(id: number): Promise<Foto> {
  try {
    const { data } = await api.get<Foto>(TURISMO_ENDPOINTS.fotoAdminDetalle(id));

    return normalizarFoto(data);
  } catch (error) {
    throw aFotosError(error, "No pudimos leer la foto subida.");
  }
}

/* ==========================================================================
   Subida directa (imágenes)
   ========================================================================== */

const dormir = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Sube una imagen directo a Cloudinary y persiste el registro.
 *
 * @param onProgress recibe 0–100 mientras el navegador transfiere el archivo.
 */
export async function subirImagenDirecta(
  entrada: {
    atractivo: string;
    archivo: File;
    orden?: number;
  },
  onProgress?: (porcentaje: number) => void,
): Promise<Foto> {
  const { atractivo, archivo, orden = 0 } = entrada;

  if (!CLOUDINARY_UPLOAD_BASE) {
    throw new FotosAdminApiError(
      "Cloudinary no está configurado en el frontend (VITE_CLOUDINARY_CLOUD_NAME).",
      503,
    );
  }

  const categoria = tipoDeArchivo(archivo) ?? "imagen";
  const firma = await firmarFoto({
    atractivo,
    formato: extensionDe(archivo.name),
    bytes: archivo.size,
  });

  const formulario = new FormData();
  formulario.append("file", archivo);
  formulario.append("api_key", firma.api_key);
  formulario.append("timestamp", String(firma.timestamp));
  formulario.append("signature", firma.signature);
  formulario.append("folder", firma.folder);
  formulario.append("allowed_formats", firma.allowed_formats.join(","));

  const recurso = categoria === "video" ? "video" : "image";

  let subida: {
    public_id: string;
    secure_url: string;
    width?: number;
    height?: number;
  };

  try {
    const { data } = await axios.post(
      `${CLOUDINARY_UPLOAD_BASE}/${recurso}/upload`,
      formulario,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evento) => {
          if (onProgress && evento.total) {
            onProgress(Math.round((evento.loaded / evento.total) * 100));
          }
        },
      },
    );

    subida = data;
  } catch (error) {
    throw aFotosError(error, "Cloudinary rechazó la subida de la imagen.");
  }

  // La subida directa ya nace completa: el registro se crea en `completed`.
  return registrarFoto({
    atractivo,
    public_id: subida.public_id,
    url: subida.secure_url,
    tipo: categoria,
    estado: "completed",
    ancho: subida.width ?? null,
    alto: subida.height ?? null,
    orden,
  });
}

/* ==========================================================================
   Subida asíncrona (videos) — multipart + polling
   ========================================================================== */

const MAX_INTENTOS_ESTADO = 40;
const ESPERA_ESTADO_MS = 1500;

/**
 * Encuela la subida de un video y espera a que Celery termine.
 *
 * El backend responde 202 con la `Foto` en `pending`; se consulta
 * `/estado/` hasta `completed` o `failed`.
 */
export async function subirVideoAsync(
  entrada: { atractivo: string; archivo: File; orden?: number },
  onProgress?: (porcentaje: number) => void,
): Promise<Foto> {
  const { atractivo, archivo, orden = 0 } = entrada;

  const formulario = new FormData();
  formulario.append("atractivo", atractivo);
  formulario.append("tipo", "video");
  formulario.append("orden", String(orden));
  formulario.append("archivo", archivo);

  let idFoto: number;

  try {
    const { data } = await api.post<{ id_foto: number; estado: EstadoFoto }>(
      TURISMO_ENDPOINTS.fotoSubir,
      formulario,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evento) => {
          if (onProgress && evento.total) {
            // El archivo se está subiendo al backend; la subida a Cloudinary
            // ocurre después en el worker.
            onProgress(Math.round((evento.loaded / evento.total) * 100));
          }
        },
      },
    );

    idFoto = data.id_foto;
  } catch (error) {
    throw aFotosError(error, "No pudimos enviar el video al servidor.");
  }

  for (let intento = 0; intento < MAX_INTENTOS_ESTADO; intento += 1) {
    const estado = await estadoFoto(idFoto);

    if (estado.estado === "completed") {
      return obtenerFoto(idFoto);
    }

    if (estado.estado === "failed") {
      throw new FotosAdminApiError(
        "El servidor no pudo procesar el video. Intentá con otro archivo.",
        422,
      );
    }

    onProgress?.(Math.min(99, 10 + intento));
    await dormir(ESPERA_ESTADO_MS);
  }

  throw new FotosAdminApiError(
    "El video sigue procesándose. Recargá la página en un momento para verlo.",
    408,
  );
}

/** Elige el flujo según el tipo de archivo. */
export async function subirFotoDestino(
  entrada: { atractivo: string; archivo: File; orden?: number },
  onProgress?: (porcentaje: number) => void,
): Promise<Foto> {
  const tipo = tipoDeArchivo(entrada.archivo);

  if (tipo === "video") {
    return subirVideoAsync(entrada, onProgress);
  }

  return subirImagenDirecta(entrada, onProgress);
}

export const fotosAdminApi = {
  firmarFoto,
  listarFotosDe,
  eliminarFoto,
  estadoFoto,
  subirImagenDirecta,
  subirVideoAsync,
  subirFotoDestino,
};
