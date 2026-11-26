/**
 * Tarjeta de un destino del Top-K.
 *
 * Prioriza la lectura del turista: porcentaje de afinidad grande, motivo
 * legible y desglose de dinero (entrada + traslado estimado = total). El
 * costo de traslado se calcula en el cliente a partir de `distancia_km`
 * porque el motor solo devuelve la distancia, no la tarifa de movilidad.
 */

import { Link } from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import type { Recomendacion } from "../../../types/recomendaciones";
import { formatearBob } from "../../preferencias/utils/validaciones";
import {
  describirMotivo,
  nivelAfinidad,
  porcentajeAfinidad,
} from "../utils/afinidad";
import {
  estimarTraslado,
  formatearDistancia,
  formatearMinutos,
} from "../utils/estimacionTraslado";
import { AnilloAfinidad } from "./AnilloAfinidad";

function formatearHoras(horas: number): string {
  if (!Number.isFinite(horas) || horas <= 0) {
    return "Sin dato";
  }

  return `${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 1,
  }).format(horas)} h`;
}

interface TarjetaRecomendacionProps {
  recomendacion: Recomendacion;
  /** Posición 1-based dentro del Top-K. */
  posicion: number;
}

export function TarjetaRecomendacion({
  recomendacion,
  posicion,
}: TarjetaRecomendacionProps) {
  const porcentaje = porcentajeAfinidad(recomendacion.puntaje);
  const nivel = nivelAfinidad(porcentaje);
  const traslado = estimarTraslado(recomendacion.distancia_km);
  const total = recomendacion.costo_bob + traslado.costoBob;
  const tieneAvisos = recomendacion.motivos.length > 0;

  return (
    <article
      data-testid="tarjeta-recomendacion"
      className="group relative overflow-hidden rounded-[1.75rem] border border-[var(--color-border)]/[0.09] bg-[var(--color-surface)] p-5 shadow-[0_16px_45px_rgba(72,55,38,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-action)] hover:shadow-[0_22px_55px_rgba(72,55,38,0.11)] sm:p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[var(--color-action)] blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--color-surface)] px-2 text-[0.7rem] font-black tabular-nums text-[var(--color-text)]">
              #{posicion}
            </span>

            <span
              className={[
                "rounded-full border px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em]",
                recomendacion.viable
                  ? "border-[var(--color-border-strong)] bg-[var(--color-route-strong)]/[0.07] text-[var(--color-brand)]"
                  : "border-[var(--color-brand)] bg-[var(--color-action)] text-[var(--color-brand)]",
              ].join(" ")}
            >
              {recomendacion.viable ? "Dentro de tus límites" : "Revisar límites"}
            </span>
          </div>

          <h3 className="mt-3 break-words text-lg font-black leading-tight tracking-tight text-[var(--color-text)] sm:text-xl">
            <Link
              to={`/destinos/${recomendacion.id_atractivo}`}
              className="transition-colors hover:text-[var(--color-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-brand)]"
            >
              {recomendacion.nombre}
            </Link>
          </h3>

          {recomendacion.categorias.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Categorías">
              {recomendacion.categorias.map((categoria) => (
                <li
                  key={categoria}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-[0.62rem] font-bold text-[var(--color-text-muted)]"
                >
                  {categoria}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <p className="text-sm font-black text-[var(--color-brand)]">
              {nivel.etiqueta}
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--color-text-muted)]">
              {nivel.detalle}
            </p>
          </div>
        </div>

        <AnilloAfinidad porcentaje={porcentaje} />
      </div>

      {tieneAvisos && (
        <ul
          className="relative mt-4 space-y-1.5 rounded-2xl border border-[var(--color-brand)] bg-[var(--color-action)]/[0.06] px-4 py-3"
          aria-label="Avisos del motor"
        >
          {recomendacion.motivos.map((motivo) => (
            <li
              key={motivo}
              className="flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--color-brand)]"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-action)]"
              />
              {describirMotivo(motivo)}
            </li>
          ))}
        </ul>
      )}

      <dl className="relative mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[var(--color-border)]/[0.08] bg-[var(--color-surface-muted)] p-3 sm:gap-3 sm:p-4">
        <div className="min-w-0">
          <dt className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Entrada
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[var(--color-text)] sm:text-base">
            {formatearBob(recomendacion.costo_bob)}
          </dd>
        </div>

        <div className="min-w-0 border-l border-[var(--color-border)] pl-3 sm:pl-4">
          <dt className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Traslado
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[var(--color-text)] sm:text-base">
            ≈ {formatearBob(traslado.costoBob)}
          </dd>
          <p className="mt-0.5 text-[0.6rem] leading-4 text-[var(--color-text-muted)]">
            {formatearDistancia(recomendacion.distancia_km)} ·{" "}
            {formatearMinutos(traslado.minutos)}
          </p>
        </div>

        <div className="min-w-0 border-l border-[var(--color-border)] pl-3 sm:pl-4">
          <dt className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-brand)]">
            Total estimado
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[var(--color-brand)] sm:text-base">
            ≈ {formatearBob(total)}
          </dd>
          <p className="mt-0.5 text-[0.6rem] leading-4 text-[var(--color-text-muted)]">
            ida y vuelta
          </p>
        </div>
      </dl>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[var(--color-text-muted)]">
          <li className="inline-flex items-center gap-1.5">
            <Icono nombre="reloj" className="h-4 w-4 text-[var(--color-text-muted)]" />
            Visita de {formatearHoras(recomendacion.duracion_horas)}
          </li>

          <li className="inline-flex items-center gap-1.5">
            <Icono nombre="ubicacion" className="h-4 w-4 text-[var(--color-brand)]" />
            {formatearDistancia(recomendacion.distancia_km)} desde tu salida
          </li>
        </ul>

        <Link
          to={`/destinos/${recomendacion.id_atractivo}`}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-route-strong)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-strong)]"
        >
          Ver destino
          <Icono nombre="flecha" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
