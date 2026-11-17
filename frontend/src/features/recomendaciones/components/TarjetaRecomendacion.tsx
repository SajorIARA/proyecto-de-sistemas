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
      className="group relative overflow-hidden rounded-[1.75rem] border border-[#5B3A29]/[0.09] bg-[#FFFDF8] p-5 shadow-[0_16px_45px_rgba(72,55,38,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C6923B]/45 hover:shadow-[0_22px_55px_rgba(72,55,38,0.11)] sm:p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#C6923B]/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#233128] px-2 text-[0.7rem] font-black tabular-nums text-[#F3EBDD]">
              #{posicion}
            </span>

            <span
              className={[
                "rounded-full border px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em]",
                recomendacion.viable
                  ? "border-[#2F4B3B]/20 bg-[#2F4B3B]/[0.07] text-[#2F4B3B]"
                  : "border-[#9A5B3C]/25 bg-[#9A5B3C]/10 text-[#8D4F32]",
              ].join(" ")}
            >
              {recomendacion.viable ? "Dentro de tus límites" : "Revisar límites"}
            </span>
          </div>

          <h3 className="mt-3 break-words text-lg font-black leading-tight tracking-tight text-[#233128] sm:text-xl">
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
                  className="rounded-full border border-[#5B3A29]/10 bg-[#F3EBDD]/70 px-2.5 py-1 text-[0.62rem] font-bold text-[#6F655B]"
                >
                  {categoria}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <p className="text-sm font-black text-[#2F4B3B]">
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
          className="relative mt-4 space-y-1.5 rounded-2xl border border-[#9A5B3C]/20 bg-[#9A5B3C]/[0.06] px-4 py-3"
          aria-label="Avisos del motor"
        >
          {recomendacion.motivos.map((motivo) => (
            <li
              key={motivo}
              className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#8D4F32]"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9A5B3C]"
              />
              {describirMotivo(motivo)}
            </li>
          ))}
        </ul>
      )}

      <dl className="relative mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[#5B3A29]/[0.08] bg-[#F7F1E6]/70 p-3 sm:gap-3 sm:p-4">
        <div className="min-w-0">
          <dt className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#8A8177]">
            Entrada
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[#233128] sm:text-base">
            {formatearBob(recomendacion.costo_bob)}
          </dd>
        </div>

        <div className="min-w-0 border-l border-[#5B3A29]/10 pl-3 sm:pl-4">
          <dt className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#8A8177]">
            Traslado
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[#233128] sm:text-base">
            ≈ {formatearBob(traslado.costoBob)}
          </dd>
          <p className="mt-0.5 text-[0.6rem] leading-4 text-[#8A8177]">
            {formatearDistancia(recomendacion.distancia_km)} ·{" "}
            {formatearMinutos(traslado.minutos)}
          </p>
        </div>

        <div className="min-w-0 border-l border-[#5B3A29]/10 pl-3 sm:pl-4">
          <dt className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#8D4F32]">
            Total estimado
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[#8D4F32] sm:text-base">
            ≈ {formatearBob(total)}
          </dd>
          <p className="mt-0.5 text-[0.6rem] leading-4 text-[#8A8177]">
            ida y vuelta
          </p>
        </div>
      </dl>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#746D63]">
          <li className="inline-flex items-center gap-1.5">
            <Icono nombre="reloj" className="h-4 w-4 text-[#6F8064]" />
            Visita de {formatearHoras(recomendacion.duracion_horas)}
          </li>

          <li className="inline-flex items-center gap-1.5">
            <Icono nombre="ubicacion" className="h-4 w-4 text-[#9A5B3C]" />
            {formatearDistancia(recomendacion.distancia_km)} desde tu salida
          </li>
        </ul>

        <Link
          to={`/destinos/${recomendacion.id_atractivo}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#5B3A29]/15 bg-[#FFFDF8] px-4 py-2 text-xs font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] hover:bg-[#2F4B3B] hover:text-[#FFFDF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F4B3B]"
        >
          Ver destino
          <Icono nombre="flecha" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
