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
      className="group relative overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8] p-5 transition-colors duration-300 hover:border-[#9A5B3C]/45 sm:p-6"
    >
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center bg-[#233128] px-2 font-mono text-[9px] font-bold tabular-nums text-[#F3EBDD]">
              #{posicion}
            </span>

            <span
              className={[
                "border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em]",
                recomendacion.viable
                  ? "border-[#2F4B3B]/25 bg-[#EDF2E9] text-[#304A38]"
                  : "border-[#9A5B3C]/25 bg-[#F6E8DF] text-[#713A2A]",
              ].join(" ")}
            >
              {recomendacion.viable ? "Dentro de tus límites" : "Revisar límites"}
            </span>
          </div>

          <h3 className="mt-3 break-words font-display text-xl font-black leading-tight tracking-[-0.02em] text-[#233128] sm:text-2xl">
            <Link
              to={`/destinos/${recomendacion.id_atractivo}`}
              className="transition-colors hover:text-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9A5B3C]"
            >
              {recomendacion.nombre}
            </Link>
          </h3>

          {recomendacion.categorias.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Categorías">
              {recomendacion.categorias.map((categoria) => (
                <li
                  key={categoria}
                  className="border border-[#5B3A29]/15 bg-[#F3EBDD]/60 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#6F655B]"
                >
                  {categoria}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#2F4B3B]">
              {nivel.etiqueta}
            </p>
            <p className="mt-1 text-xs leading-6 text-[#746D63]">
              {nivel.detalle}
            </p>
          </div>
        </div>

        <AnilloAfinidad porcentaje={porcentaje} />
      </div>

      {tieneAvisos && (
        <ul
          className="relative mt-4 space-y-1.5 border-l-2 border-[#9A5B3C]/45 bg-[#F6E8DF]/60 px-4 py-3"
          aria-label="Avisos del motor"
        >
          {recomendacion.motivos.map((motivo) => (
            <li
              key={motivo}
              className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#713A2A]"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#9A5B3C]"
              />
              {describirMotivo(motivo)}
            </li>
          ))}
        </ul>
      )}

      <dl className="relative mt-5 grid grid-cols-3 divide-x divide-[#5B3A29]/12 border border-[#5B3A29]/15 bg-[#FFFDF8]">
        <div className="min-w-0 px-3 py-3 sm:px-4">
          <dt className="font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8A8177]">
            Entrada
          </dt>
          <dd className="mt-1 font-display text-base font-black tabular-nums text-[#233128] sm:text-lg">
            {formatearBob(recomendacion.costo_bob)}
          </dd>
        </div>

        <div className="min-w-0 px-3 py-3 sm:px-4">
          <dt className="font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8A8177]">
            Traslado
          </dt>
          <dd className="mt-1 font-display text-base font-black tabular-nums text-[#233128] sm:text-lg">
            ≈ {formatearBob(traslado.costoBob)}
          </dd>
          <p className="mt-0.5 font-mono text-[7.5px] leading-4 tracking-[0.06em] text-[#8A8177]">
            {formatearDistancia(recomendacion.distancia_km)} ·{" "}
            {formatearMinutos(traslado.minutos)}
          </p>
        </div>

        <div className="min-w-0 bg-[#F3EBDD]/40 px-3 py-3 sm:px-4">
          <dt className="font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8D4F32]">
            Total estimado
          </dt>
          <dd className="mt-1 font-display text-base font-black tabular-nums text-[#8D4F32] sm:text-lg">
            ≈ {formatearBob(total)}
          </dd>
          <p className="mt-0.5 font-mono text-[7.5px] leading-4 tracking-[0.06em] text-[#8A8177]">
            ida y vuelta
          </p>
        </div>
      </dl>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#746D63]">
          <li className="inline-flex items-center gap-1.5">
            <Icono nombre="reloj" className="h-3.5 w-3.5 text-[#6F8064]" />
            Visita de {formatearHoras(recomendacion.duracion_horas)}
          </li>

          <li className="inline-flex items-center gap-1.5">
            <Icono nombre="ubicacion" className="h-3.5 w-3.5 text-[#9A5B3C]" />
            {formatearDistancia(recomendacion.distancia_km)} desde tu salida
          </li>
        </ul>

        <Link
          to={`/destinos/${recomendacion.id_atractivo}`}
          className="inline-flex items-center gap-2 border border-[#5B3A29]/20 px-3.5 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#2F4B3B] transition hover:border-[#233128] hover:bg-[#233128] hover:text-[#FFFDF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F4B3B]"
        >
          Ver destino
          <span
            aria-hidden="true"
            className="font-display text-sm transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
