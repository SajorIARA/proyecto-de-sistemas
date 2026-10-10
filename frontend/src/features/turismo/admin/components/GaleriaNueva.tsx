/**
 * Galería en modo borrador para el **alta** de un destino.
 *
 * El backend referencia cada foto por el `id_atractivo` (firma, `folder`,
 * persistencia), así que durante el alta todavía no se puede subir: el
 * destino no existe. Esta sección deja elegir y previsualizar los archivos
 * localmente y los entrega al formulario; `AdminDestinoFormPage` los sube
 * apenas el `POST` devuelve el id.
 *
 * Es el hermano "sin red" de `GaleriaAdmin`: mismo cascarón visual y misma
 * validación (`validarArchivo`), pero el estado es controlado por la página
 * (los archivos son suyos, para poder subirlos tras crear el destino).
 */

import { useRef, useState, type ChangeEvent } from "react";
import { CLOUDINARY_UPLOAD_BASE } from "../../../../config/turismo";
import { validarArchivo } from "../api/fotosAdminApi";
import {
  crearPendiente,
  type ArchivoPendiente,
} from "../utils/archivosPendientes";

export function GaleriaNueva({
  archivos,
  onAgregar,
  onQuitar,
  deshabilitado = false,
}: {
  /** Archivos ya elegidos, propiedad de la página. */
  archivos: ArchivoPendiente[];
  /** Se llama solo con los archivos que pasaron la validación. */
  onAgregar: (archivos: ArchivoPendiente[]) => void;
  onQuitar: (id: string) => void;
  /** `true` mientras el formulario guarda o se están subiendo los archivos. */
  deshabilitado?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errores, setErrores] = useState<string[]>([]);

  const sinCloudinary = !CLOUDINARY_UPLOAD_BASE;
  const bloqueado = deshabilitado || sinCloudinary;

  function alSeleccionar(evento: ChangeEvent<HTMLInputElement>) {
    const seleccion = Array.from(evento.target.files ?? []);

    if (inputRef.current) {
      // Permite volver a elegir el mismo archivo tras un error.
      inputRef.current.value = "";
    }

    const motivos: string[] = [];
    const validos: ArchivoPendiente[] = [];

    for (const archivo of seleccion) {
      const motivo = validarArchivo(archivo);

      if (motivo) {
        motivos.push(motivo);
      } else {
        validos.push(crearPendiente(archivo));
      }
    }

    setErrores(motivos);

    if (validos.length > 0) {
      onAgregar(validos);
    }
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.08)]">
      <div className="flex items-center gap-3 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
        <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />
        <h2 className="text-lg font-black tracking-tight text-[#233128]">
          Fotografías y videos
        </h2>
      </div>

      <div className="space-y-6 px-6 py-7 sm:px-8">
        {sinCloudinary && (
          <p
            role="status"
            className="rounded-2xl border border-[#C6923B]/40 bg-[#C6923B]/[0.12] px-4 py-3 text-xs font-semibold text-[#7A5618]"
          >
            Cloudinary no está configurado en el frontend
            (`VITE_CLOUDINARY_CLOUD_NAME`). No se pueden agregar imágenes
            hasta configurarlo.
          </p>
        )}

        {/* Selector de archivos */}
        <div>
          <label
            htmlFor="nuevo-destino-archivos"
            className={`inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition ${
              bloqueado
                ? "cursor-not-allowed opacity-45"
                : "cursor-pointer hover:bg-[#233128]"
            }`}
          >
            <span aria-hidden="true">＋</span>
            Agregar imágenes o videos
            <input
              id="nuevo-destino-archivos"
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="sr-only"
              disabled={bloqueado}
              onChange={(evento) => alSeleccionar(evento)}
            />
          </label>

          <p className="mt-2 text-xs leading-5 text-[#746D63]">
            Imágenes jpg, png o webp hasta 10&nbsp;MB; videos mp4, mov o webm
            hasta 100&nbsp;MB. Se suben automáticamente al crear el destino.
          </p>
        </div>

        {/* Errores de validación de los archivos elegidos */}
        {errores.length > 0 && (
          <ul
            role="alert"
            className="space-y-1 rounded-2xl border border-[#9A3B2E]/25 bg-[#9A3B2E]/[0.07] px-4 py-3 text-xs font-semibold text-[#9A3B2E]"
          >
            {errores.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        )}

        {/* Listado de pendientes */}
        {archivos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#5B3A29]/20 px-4 py-8 text-center text-sm font-semibold text-[#746D63]">
            Todavía no agregaste archivos. Podés cargarlos ahora y se subirán
            solos al guardar el destino.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {archivos.map((item, indice) => (
              <li
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-[#5B3A29]/12 bg-[#F3EBDD]/50"
              >
                <div className="relative aspect-[4/3]">
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={`Archivo ${indice + 1} de ${archivos.length}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#233128]/90 text-[#FFFDF8]">
                      <span aria-hidden="true" className="text-2xl">
                        {item.tipo === "video" ? "🎬" : "🖼️"}
                      </span>
                      <span className="text-[0.6rem] font-black uppercase tracking-[0.14em]">
                        {item.tipo === "video" ? "Video" : "Imagen"}
                      </span>
                    </div>
                  )}

                  <span className="absolute left-2 top-2 rounded-full bg-[#233128]/85 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#FFFDF8]">
                    Sin subir
                  </span>

                  <button
                    type="button"
                    onClick={() => onQuitar(item.id)}
                    disabled={deshabilitado}
                    aria-label={`Quitar el archivo ${indice + 1}`}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#9A3B2E] text-sm font-black text-[#FFFDF8] opacity-0 transition focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ×
                  </button>
                </div>

                <p className="truncate px-3 py-2 text-[0.62rem] font-semibold text-[#746D63]">
                  {indice === 0 ? "Portada · " : ""}
                  {item.archivo.name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
