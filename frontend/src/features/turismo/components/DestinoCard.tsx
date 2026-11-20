/**
 * Ficha fotográfica de un destino del catálogo.
 *
 * Cada resultado se presenta como una lámina de guía impresa: fotografía
 * grande, número de ficha y categoría sobre la imagen, y un pie con el
 * nombre, la dirección, una descripción breve y el acceso al detalle. El
 * catálogo decide el ancho y la proporción de cada ficha para romper la
 * cuadrícula uniforme.
 *
 * La tarifa base no se consulta aquí: `AtractivoSerializer` no la incluye y
 * pedirla por ficha dispararía el `AnonRateThrottle`. Se muestra en el detalle.
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
  /** Posición de la ficha dentro del catálogo (base 0). */
  indice?: number;
  /** Total de fichas visibles, para el rótulo "Ficha 01 / 08". */
  total?: number;
  /** Clases responsive de la proporción de la fotografía. */
  aspecto?: string;
  /** La primera ficha del índice recibe un titular de mayor escala. */
  destacada?: boolean;
}

function numeroFicha(valor: number): string {
  return String(valor).padStart(2, "0");
}

const SIZES =
  "(min-width: 1280px) 42vw, (min-width: 1024px) 48vw, (min-width: 640px) 44vw, 92vw";

export function DestinoCard({
  atractivo,
  busqueda = "",
  indice,
  total,
  aspecto = "aspect-[4/3]",
  destacada = false,
}: DestinoCardProps) {
  const categoria = atractivo.categorias[0] ?? null;
  const ubicacion = atractivo.direccion?.trim();
  const descripcion = recortar(atractivo.descripcion);
  const duracion = formatearDuracion(atractivo.duracion_minutos);
  const detalle = `/destinos/${atractivo.id}${busqueda ? `?${busqueda}` : ""}`;
  const imagenes = useMemo(() => imagenesDe(atractivo), [atractivo]);
  const rotulo = typeof indice === "number" ? numeroFicha(indice + 1) : null;

  return (
    <article
      className="ficha-aparece group flex min-w-0 flex-col"
      style={{
        animationDelay: `${Math.min(indice ?? 0, 8) * 55}ms`,
      }}
    >
      <div className={`relative shrink-0 overflow-hidden bg-[#233128] ${aspecto}`}>
        <CarruselImagenes
          imagenes={imagenes}
          alt={atractivo.nombre}
          prioritaria
          sizes={SIZES}
          className="h-full w-full transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          fallback={
            <DestinoImagen
              atractivo={atractivo}
              categoria={categoria}
              prioritaria
              sizes={SIZES}
              className="h-full w-full transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          }
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101710]/55 via-transparent to-[#101710]/15" />

        {categoria && (
          <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
            <CategoriaBadge categoria={categoria} />
          </div>
        )}

        {rotulo && (
          <span
            className="absolute right-3 top-2 font-display text-[clamp(2rem,4.5vw,3.6rem)] font-black leading-none tracking-[-0.06em] text-[#FFFDF8]/90 [text-shadow:0_1px_3px_rgba(16,23,16,0.45),0_16px_40px_rgba(16,23,16,0.55)] sm:right-4"
            aria-hidden="true"
          >
            {rotulo}
          </span>
        )}

        {atractivo.duracion_minutos ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-[#101710]/60 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F3EBDD] backdrop-blur-sm sm:bottom-4 sm:right-4">
            <Icono nombre="reloj" className="h-3 w-3" aria-hidden="true" />
            {duracion}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-b border-[#5B3A29]/20 pb-6 pt-4">
        <h3
          className={[
            "font-display font-black leading-[0.96] tracking-[-0.04em] text-[#233128]",
            destacada
              ? "text-[2rem] sm:text-[2.4rem] lg:text-[2.9rem]"
              : "text-[1.55rem] sm:text-[1.75rem] lg:text-[2rem]",
          ].join(" ")}
        >
          <Link
            to={detalle}
            className="decoration-[#9A5B3C]/40 decoration-2 underline-offset-[6px] transition hover:text-[#8D4F32] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
          >
            {atractivo.nombre}
          </Link>
        </h3>

        <p className="mt-2 flex items-start gap-2 font-mono text-[9px] uppercase leading-5 tracking-[0.16em] text-[#8A8177]">
          <span className="mt-0.5 shrink-0 text-[#9A5B3C]" aria-hidden="true">
            <Icono nombre="ubicacion" className="h-3.5 w-3.5" />
          </span>
          <span>{ubicacion || "Ubicación no registrada"}</span>
        </p>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#514B43]">
          {descripcion || "Sin descripción disponible por el momento."}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A8177]">
            {rotulo
              ? `Ficha ${rotulo}${total ? ` / ${numeroFicha(total)}` : ""}`
              : "Ficha de viaje"}
          </span>

          <Link
            to={detalle}
            className="group/enlace inline-flex items-center gap-2 border-b border-[#9A5B3C]/40 pb-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
          >
            Ver detalle
            <Icono
              nombre="flecha"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover/enlace:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/enlace:translate-x-0"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
