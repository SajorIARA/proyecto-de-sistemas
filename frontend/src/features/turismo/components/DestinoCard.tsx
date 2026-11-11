/**
 * Tarjeta de destino del catálogo.
 *
 * Contenido según lo definido por el Product Owner:
 * imagen · categoría · nombre · ubicación · descripción corta ·
 * botón "Ver detalle".
 *
 * La duración de visita se muestra como dato secundario porque SÍ viaja en
 * el payload de la lista. La tarifa base NO se muestra aquí a propósito:
 * `AtractivoSerializer` no incluye tarifas, y pedirlas por tarjeta
 * dispararía N peticiones extra contra un backend con AnonRateThrottle de
 * 100 req/hora. La tarifa se muestra en la vista de detalle.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Atractivo } from "../../../types/turismo";
import { Icono } from "../../../components/site/Iconos";
import { imagenesDe } from "../utils/destinoImages";
import { formatearDuracion, recortar } from "../utils/formato";
import { CarruselImagenes } from "./CarruselImagenes";
import { CategoriaBadge } from "./CategoriaBadge";
import { DestinoImagen } from "./DestinoImagen";

interface DestinoCardProps {
  atractivo: Atractivo;
  /**
   * Query string de los filtros activos (sin `?`). Se añade al enlace del
   * detalle para que "volver al catálogo" restaure la misma combinación de
   * filtros. Opcional: sin él, el enlace apunta al catálogo limpio.
   */
  busqueda?: string;
}

export function DestinoCard({ atractivo, busqueda = "" }: DestinoCardProps) {
  const categoria = atractivo.categorias[0] ?? null;
  const ubicacion = atractivo.direccion?.trim();
  const descripcion = recortar(atractivo.descripcion);
  const duracion = formatearDuracion(atractivo.duracion_minutos);
  const detalle = `/destinos/${atractivo.id}${busqueda ? `?${busqueda}` : ""}`;
  const imagenes = useMemo(() => imagenesDe(atractivo), [atractivo]);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_16px_40px_rgba(72,55,38,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(72,55,38,0.15)] focus-within:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Barra cultural superior */}
      <div className="flex h-[3px] shrink-0 overflow-hidden" aria-hidden="true">
        <span className="flex-1 bg-[#2F4B3B]" />
        <span className="flex-1 bg-[#C6923B]" />
        <span className="flex-1 bg-[#9A5B3C]" />
        <span className="flex-1 bg-[#6F8064]" />
      </div>

      {/* Fotografía: si el destino tiene varias, se alternan solas. */}
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#E9DFC9]">
        <CarruselImagenes
          imagenes={imagenes}
          alt={atractivo.nombre}
          prioritaria
          sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          fallback={
            <DestinoImagen
              atractivo={atractivo}
              categoria={categoria}
              prioritaria
              sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          }
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#263029]/78 via-[#263029]/8 to-transparent" />

        {categoria && (
          <div className="absolute left-4 top-4">
            <CategoriaBadge categoria={categoria} />
          </div>
        )}

        {atractivo.duracion_minutos ? (
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-[#F3EBDD]/25 bg-[#263029]/55 px-3 py-1.5 text-[0.62rem] font-bold text-[#F3EBDD]/95 backdrop-blur-md">
            <Icono nombre="reloj" className="h-3 w-3" aria-hidden="true" />
            <span>{duracion}</span>
          </span>
        ) : null}
      </div>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-[1.2rem] font-black leading-tight tracking-[-0.02em] text-[#233128] sm:text-xl">
          <Link
            to={detalle}
            className="rounded-sm underline-offset-4 transition hover:text-[#8D4F32] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
          >
            {atractivo.nombre}
          </Link>
        </h3>

        <p className="mt-2.5 flex items-start gap-2 text-xs font-semibold leading-5 text-[#7A4A31] sm:text-[0.8rem]">
          <span className="mt-0.5 shrink-0 text-[#8D4F32]" aria-hidden="true">
            <Icono nombre="ubicacion" className="h-3.5 w-3.5" />
          </span>
          <span>{ubicacion || "Ubicación no registrada"}</span>
        </p>

        <p className="mt-4 text-sm leading-6 text-[#514B43]">
          {descripcion || "Sin descripción disponible por el momento."}
        </p>

        <div className="mt-auto pt-6">
          <Link
            to={detalle}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#2F4B3B] px-5 py-3.5 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B] motion-reduce:transition-none"
          >
            Ver detalle
            <span
              className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              aria-hidden="true"
            >
              <Icono nombre="flecha" className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
