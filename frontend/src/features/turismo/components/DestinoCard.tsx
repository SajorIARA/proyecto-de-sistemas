import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import type { Atractivo } from "../../../types/turismo";
import { imagenesDe } from "../utils/destinoImages";
import {
  formatearDuracion,
  formatearUbicacion,
  recortar,
} from "../utils/formato";
import { CarruselImagenes } from "./CarruselImagenes";
import { CategoriaBadge } from "./CategoriaBadge";
import { DestinoImagen } from "./DestinoImagen";

interface DestinoCardProps {
  atractivo: Atractivo;
  busqueda?: string;
  enRuta?: boolean;
  onAlternarRuta?: (id: Atractivo["id"]) => void;
}

export function DestinoCard({
  atractivo,
  busqueda = "",
  enRuta = false,
  onAlternarRuta,
}: DestinoCardProps) {
  const categoria = atractivo.categorias[0] ?? null;
  const detalle = `/destinos/${atractivo.id}${busqueda ? `?${busqueda}` : ""}`;
  const imagenes = useMemo(() => imagenesDe(atractivo), [atractivo]);
  const duracion = formatearDuracion(atractivo.duracion_minutos);

  return (
    <article className="chuki-catalog-card group flex h-full flex-col overflow-hidden bg-[var(--color-surface)] shadow-[0_16px_45px_rgb(7_25_45_/_0.1)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgb(7_25_45_/_0.18)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-muted)]">
        <CarruselImagenes
          imagenes={imagenes}
          alt={atractivo.nombre}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          fallback={
            <DestinoImagen
              atractivo={atractivo}
              categoria={categoria}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="h-full w-full object-cover"
            />
          }
        />
        {categoria && (
          <div className="absolute left-3 top-3">
            <CategoriaBadge categoria={categoria} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t-4 border-[var(--color-action)] p-5 sm:p-6">
        <h3 className="lp-editorial-title text-3xl leading-[0.95]">
          <Link to={detalle} className="hover:text-[var(--color-brand)]">
            {atractivo.nombre}
          </Link>
        </h3>

        <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-[var(--color-text-muted)]">
          <Icono nombre="ubicacion" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-route)]" />
          <span>
            {formatearUbicacion(atractivo.direccion, atractivo.ubicacion)}
          </span>
        </p>

        <dl className="mt-4 grid grid-cols-2 border-y border-[var(--color-border)] py-3 text-xs">
          <div>
            <dt className="text-[var(--color-text-muted)]">Duración</dt>
            <dd className="mt-1 font-data font-bold">{duracion || "Sin confirmar"}</dd>
          </div>
          <div className="border-l border-[var(--color-border)] pl-4">
            <dt className="text-[var(--color-text-muted)]">Costo</dt>
            <dd className="mt-1 font-bold">Ver tarifas</dd>
          </div>
        </dl>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
          {recortar(atractivo.descripcion) ||
            "La información de este destino se está completando."}
        </p>

        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-5">
          <Link
            to={detalle}
            className="lp-button lp-button--secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-bold"
          >
            Explorar
            <Icono nombre="flecha" className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => onAlternarRuta?.(atractivo.id)}
            aria-pressed={enRuta}
            aria-label={
              enRuta
                ? `Quitar ${atractivo.nombre} de la ruta`
                : `+ Ruta: añadir ${atractivo.nombre}`
            }
            className={[
              "lp-button inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm font-black",
              enRuta ? "lp-button--route" : "lp-button--primary",
            ].join(" ")}
          >
            {enRuta ? "✓ En ruta" : "+ Ruta"}
          </button>
        </div>
      </div>
    </article>
  );
}
