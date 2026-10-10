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
import { imagenesDe } from "../utils/destinoImages";
import { formatearDuracion, recortar } from "../utils/formato";
import { CarruselImagenes } from "./CarruselImagenes";
import { CategoriaBadge } from "./CategoriaBadge";
import { DestinoImagen } from "./DestinoImagen";

interface DestinoCardProps {
  atractivo: Atractivo;
}

export function DestinoCard({ atractivo }: DestinoCardProps) {
  const categoria = atractivo.categorias[0] ?? null;
  const ubicacion = atractivo.direccion?.trim();
  const descripcion = recortar(atractivo.descripcion);
  const duracion = formatearDuracion(atractivo.duracion_minutos);
  const detalle = `/destinos/${atractivo.id}`;
  const imagenes = useMemo(() => imagenesDe(atractivo), [atractivo]);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_16px_40px_rgba(72,55,38,0.09)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_60px_rgba(72,55,38,0.16)] focus-within:-translate-y-1.5">
      {/* Barra cultural superior */}
      <div className="flex h-[3px] shrink-0 overflow-hidden">
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
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full transition duration-700 group-hover:scale-[1.06]"
          fallback={
            <DestinoImagen
              atractivo={atractivo}
              categoria={categoria}
              prioritaria
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full transition duration-700 group-hover:scale-[1.06]"
            />
          }
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#263029]/75 via-[#263029]/5 to-transparent" />

        {categoria && (
          <div className="absolute left-4 top-4">
            <CategoriaBadge categoria={categoria} />
          </div>
        )}

        {atractivo.duracion_minutos ? (
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-[#F3EBDD]/25 bg-[#263029]/50 px-3 py-1.5 text-[0.6rem] font-bold text-[#F3EBDD]/90 backdrop-blur-md">
            <span aria-hidden="true">⏱</span>
            {duracion}
          </span>
        ) : null}
      </div>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-black leading-tight tracking-[-0.02em] text-[#233128]">
          {atractivo.nombre}
        </h3>

        <p className="mt-2.5 flex items-start gap-2 text-xs font-semibold leading-5 text-[#8D4F32]">
          <span className="mt-px shrink-0" aria-hidden="true">
            📍
          </span>
          <span>{ubicacion || "Ubicación no registrada"}</span>
        </p>

        <p className="mt-4 text-sm leading-6 text-[#514B43]">
          {descripcion || "Sin descripción disponible por el momento."}
        </p>

        <div className="mt-auto pt-6">
          <Link
            to={detalle}
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#2F4B3B] px-5 py-3.5 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
          >
            Ver detalle
            <span
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
