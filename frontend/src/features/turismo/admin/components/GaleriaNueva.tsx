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
            (`VITE_CLOUDINARY_CLOUD_NAME`). No se pueden agregar imágenes
            hasta configurarlo.
          </p>
        )}

        {/* Selector de archivos */}
        <div>
          <label
            htmlFor="nuevo-destino-archivos"
            className={`inline-flex items-center gap-2.5 bg-[#233128] px-5 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#FFFDF8] transition ${
              bloqueado
                ? "cursor-not-allowed opacity-45"
                : "cursor-pointer hover:bg-[#2F4B3B]"
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
            className="space-y-1 border-l-2 border-[#9A5B3C]/50 bg-[#F6E8DF]/60 px-4 py-3 text-xs font-semibold text-[#713A2A]"
          >
            {errores.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        )}

        {/* Listado de pendientes */}
        {archivos.length === 0 ? (
          <p className="border border-dashed border-[#5B3A29]/20 px-4 py-8 text-center text-sm font-semibold text-[#746D63]">
            Todavía no agregaste archivos. Podés cargarlos ahora y se subirán
            solos al guardar el destino.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {archivos.map((item, indice) => (
              <li
                key={item.id}
                className="group relative overflow-hidden border border-[#5B3A29]/15 bg-[#F3EBDD]/50"
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

                  <span className="absolute left-2 top-2 bg-[#233128]/90 px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.14em] text-[#FFFDF8]">
                    Sin subir
                  </span>

                  <button
                    type="button"
                    onClick={() => onQuitar(item.id)}
                    disabled={deshabilitado}
                    aria-label={`Quitar el archivo ${indice + 1}`}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center bg-[#9A3B2E] text-sm font-black text-[#FFFDF8] opacity-0 transition focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ×
                  </button>
                </div>

                <p className="truncate px-3 py-2 font-mono text-[7.5px] uppercase tracking-[0.06em] text-[#746D63]">
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
