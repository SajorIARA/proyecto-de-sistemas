/**
 * Galería administrable de un destino: subir, ver y eliminar fotos/videos.
 *
 * Se monta solo en edición (ya hay `id_atractivo`), porque toda la API de
 * medios referencia al destino por su UUID. Por eso el alta guarda primero y
 * `AdminDestinoFormPage` navega a la edición para subir los archivos.
 *
 * El progreso de subida es local (`useState`): es efímero y de un único
 * consumidor, no tiene sentido cachearlo. Las fotos sí viven en React Query
 * (`useFotosDe`), que además invalida el catálogo público al cambiar.
 */

import { useRef, useState, type ChangeEvent } from "react";
import { CLOUDINARY_TRANSFORM, CLOUDINARY_UPLOAD_BASE } from "../../../../config/turismo";
import type { Foto } from "../../../../types/turismo";
import { urlCloudinary } from "../../utils/destinoImages";
import { normalizarFoto, validarArchivo } from "../api/fotosAdminApi";
import { useEliminarFoto, useFotosDe, useSubirFoto } from "../hooks/useFotosAdmin";

const ETIQUETA_ESTADO: Record<Foto["estado"], string> = {
  pending: "En cola",
  processing: "Procesando",
  completed: "Lista",
  failed: "Falló",
};

/** Miniatura de una imagen; para videos no hay (requiere transform aparte). */
function miniaturaDe(foto: Foto): string | null {
  if (foto.tipo === "video") {
    return null;
  }

  const viaPublicId = urlCloudinary(foto.public_id, CLOUDINARY_TRANSFORM.miniatura);

  return viaPublicId ?? (foto.url.trim() || null);
}

export function GaleriaAdmin({
  atractivoId,
  fotosIniciales = [],
}: {
  atractivoId: string;
  /** Fotos ya cargadas con el destino, para evitar el parpadeo inicial. */
  fotosIniciales?: Foto[];
}) {
  const { data, isPending, isError, error } = useFotosDe(atractivoId);
  const { subir, error: errorSubida, pendiente: subiendo } = useSubirFoto(atractivoId);
  const {
    eliminar,
    error: errorEliminar,
    idEnCurso,
  } = useEliminarFoto(atractivoId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [erroresArchivos, setErroresArchivos] = useState<string[]>([]);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [archivoEnCurso, setArchivoEnCurso] = useState<string | null>(null);

  const fotos = (data ?? fotosIniciales).map(normalizarFoto);
  const sinCloudinary = !CLOUDINARY_UPLOAD_BASE;

  async function alSeleccionar(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);

    if (inputRef.current) {
      // Permite volver a elegir el mismo archivo tras un error.
      inputRef.current.value = "";
    }

    if (archivos.length === 0) {
      return;
    }

    const errores: string[] = [];
    const validos: File[] = [];

    for (const archivo of archivos) {
      const motivo = validarArchivo(archivo);
      if (motivo) {
        errores.push(motivo);
      } else {
        validos.push(archivo);
      }
    }

    setErroresArchivos(errores);

    const baseOrden = fotos.length
      ? Math.max(...fotos.map((foto) => foto.orden)) + 1
      : 0;

    for (let indice = 0; indice < validos.length; indice += 1) {
      setArchivoEnCurso(validos[indice].name);
      setProgreso(0);

      const subida = await subir({
        archivo: validos[indice],
        orden: baseOrden + indice,
        onProgress: setProgreso,
      });

      if (!subida) {
        // El error ya lo muestra el hook; se corta para no encadenar fallos.
        break;
      }
    }

    setArchivoEnCurso(null);
    setProgreso(null);
  }

  return (
    <section className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]">
      <div className="border-b border-[#5B3A29]/15 px-5 py-5 sm:px-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
          02 / Medios
        </p>

        <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
          Fotografías y videos
        </h2>
      </div>

      <div className="space-y-6 px-5 py-7 sm:px-8">
        {sinCloudinary && (
          <p
            role="status"
            className="border-l-2 border-[#C6923B]/55 bg-[#FBF0D9]/70 px-4 py-3 text-xs font-semibold leading-5 text-[#664717]"
          >
            Cloudinary no está configurado en el frontend
            (`VITE_CLOUDINARY_CLOUD_NAME`). La subida directa de imágenes
            fallará hasta configurarlo.
          </p>
        )}

        {/* Selector de archivos */}
        <div>
          <label
            htmlFor={`${atractivoId}-archivos`}
            className="inline-flex cursor-pointer items-center gap-2.5 bg-[#233128] px-5 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#FFFDF8] transition hover:bg-[#2F4B3B]"
          >
            <span aria-hidden="true">＋</span>
            Agregar imágenes o videos
            <input
              id={`${atractivoId}-archivos`}
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="sr-only"
              disabled={subiendo}
              onChange={(evento) => void alSeleccionar(evento)}
            />
          </label>

          <p className="mt-2 text-xs leading-5 text-[#746D63]">
            Imágenes jpg, png o webp hasta 10&nbsp;MB; videos mp4, mov o webm
            hasta 100&nbsp;MB. Se pueden elegir varios a la vez.
          </p>
        </div>

        {/* Progreso de la subida en curso */}
        {subiendo && archivoEnCurso && (
          <div role="status" aria-live="polite">
            <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#514B43]">
              Subiendo {archivoEnCurso}
              {progreso !== null ? ` — ${progreso}%` : "…"}
            </p>

            <div className="h-1.5 w-full overflow-hidden bg-[#5B3A29]/10">
              <div
                className="h-full bg-[#2F4B3B] transition-[width] duration-200"
                style={{ width: `${progreso ?? 8}%` }}
              />
            </div>
          </div>
        )}

        {/* Errores */}
        {(erroresArchivos.length > 0 || errorSubida || errorEliminar) && (
          <ul
            role="alert"
            className="space-y-1 border-l-2 border-[#9A5B3C]/50 bg-[#F6E8DF]/60 px-4 py-3 text-xs font-semibold text-[#713A2A]"
          >
            {erroresArchivos.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
            {errorSubida && <li>{errorSubida}</li>}
            {errorEliminar && <li>{errorEliminar}</li>}
          </ul>
        )}

        {/* Listado */}
        {isPending && fotos.length === 0 && (
          <p role="status" className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8A8177]">
            Cargando fotos…
          </p>
        )}

        {isError && (
          <p role="alert" className="text-sm font-semibold text-[#9A3B2E]">
            {error instanceof Error
              ? error.message
              : "No pudimos cargar las fotos del destino."}
          </p>
        )}

        {!isPending && !isError && fotos.length === 0 && (
          <p className="border border-dashed border-[#5B3A29]/20 px-4 py-8 text-center text-sm font-semibold text-[#746D63]">
            Todavía no hay fotos. Subí la primera para que aparezca en el
            catálogo.
          </p>
        )}

        {fotos.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {fotos.map((foto, indice) => {
              const miniatura = miniaturaDe(foto);
              const enCurso = idEnCurso === foto.id_foto;

              return (
                <li
                  key={foto.id_foto}
                  className="group relative overflow-hidden border border-[#5B3A29]/15 bg-[#F3EBDD]/50"
                >
                  <div className="relative aspect-[4/3]">
                    {miniatura ? (
                      <img
                        src={miniatura}
                        alt={`Foto ${indice + 1} de ${fotos.length}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#233128]/90 text-[#FFFDF8]">
                        <span aria-hidden="true" className="text-2xl">
                          {foto.tipo === "video" ? "🎬" : "🖼️"}
                        </span>
                        <span className="text-[0.6rem] font-black uppercase tracking-[0.14em]">
                          {foto.tipo === "video" ? "Video" : "Imagen"}
                        </span>
                      </div>
                    )}

                    {foto.estado !== "completed" && (
                      <span className="absolute left-2 top-2 bg-[#233128]/90 px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.14em] text-[#FFFDF8]">
                        {ETIQUETA_ESTADO[foto.estado]}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => void eliminar(foto.id_foto)}
                      disabled={enCurso}
                      aria-label={`Eliminar la foto ${indice + 1}`}
                      className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center bg-[#9A3B2E] text-sm font-black text-[#FFFDF8] opacity-0 transition focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {enCurso ? "…" : "×"}
                    </button>
                  </div>

                  <p className="truncate px-3 py-2 font-mono text-[7.5px] uppercase tracking-[0.06em] text-[#746D63]">
                    {indice === 0 ? "Portada · " : ""}
                    {foto.tipo === "video" ? "Video" : "Imagen"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
