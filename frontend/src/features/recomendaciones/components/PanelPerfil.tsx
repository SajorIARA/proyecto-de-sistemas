/**
 * Panel compacto del perfil con el que se calcula el Top-K.
 *
 * Reutiliza los controles del formulario de preferencias (slider de
 * presupuesto y selector de duración) para que el turista reconozca la
 * interacción, pero aquí los cambios solo afectan a la consulta de
 * recomendaciones: no se guardan en el backend hasta que el turista vuelve a
 * guardar su perfil.
 */

import { type FormEvent } from "react";
import { Icono } from "../../../components/site/Iconos";
import {
  DURACION,
  MACRODISTRITOS_LA_PAZ,
} from "../../../config/preferencias";
import { RECOMENDACIONES_POR_DEFECTO } from "../../../config/recomendaciones";
import type { PerfilBusqueda } from "../../../types/recomendaciones";
import type { UnidadDuracion } from "../../../types/preferencias";
import { SliderPresupuesto } from "../../preferencias/components/SliderPresupuesto";
import { SelectorDuracion } from "../../preferencias/components/SelectorDuracion";
import {
  duracionAHoras,
  formatearBob,
} from "../../preferencias/utils/validaciones";
import { etiquetaPuntoPartida, conMacrodistrito } from "../utils/perfil";

function formatearTiempo(perfil: PerfilBusqueda): string {
  const horas = duracionAHoras(perfil.duracionValor, perfil.duracionUnidad);

  return `${perfil.duracionValor} ${
    perfil.duracionUnidad === "dias" ? "días" : "horas"
  } · ${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 1,
  }).format(horas)} h`;
}

function convertirUnidad(
  perfil: PerfilBusqueda,
  unidad: UnidadDuracion,
): number {
  const horas = duracionAHoras(perfil.duracionValor, perfil.duracionUnidad);

  if (unidad === "dias") {
    const dias = Math.round((horas / 24) * 2) / 2;

    return Math.min(Math.max(dias, DURACION.dias.min), DURACION.dias.max);
  }

  return Math.min(
    Math.max(Math.round(horas), DURACION.horas.min),
    DURACION.horas.max,
  );
}

interface PanelPerfilProps {
  perfil: PerfilBusqueda;
  onCambiar: (perfil: PerfilBusqueda) => void;
  onActualizar: () => void;
  pendiente: boolean;
}

export function PanelPerfil({
  perfil,
  onCambiar,
  onActualizar,
  pendiente,
}: PanelPerfilProps) {
  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onActualizar();
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="border border-[#5B3A29]/15 bg-[#FFFDF8] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#5B3A29]/15 bg-[#F3EBDD]/60 text-[#8D4F32]">
            <Icono nombre="brujula" className="h-6 w-6" />
          </span>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
              01 / Perfil de consulta
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
              Tu perfil de búsqueda
            </h2>
            <p className="mt-1 max-w-md text-xs leading-6 text-[#746D63]">
              La afinidad combina tus intereses, el presupuesto, el tiempo
              disponible y la distancia desde tu punto de partida.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pendiente}
          className="inline-flex items-center gap-2 bg-[#233128] px-5 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8] transition hover:bg-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Icono
            nombre="actualizar"
            className={`h-4 w-4 ${pendiente ? "animate-spin" : ""}`}
          />
          {pendiente ? "Actualizando…" : "Actualizar ranking"}
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px border border-[#5B3A29]/15 bg-[#5B3A29]/15 sm:grid-cols-4">
        <div className="bg-[#FFFDF8] px-3.5 py-3">
          <dt className="font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8A8177]">
            Presupuesto
          </dt>
          <dd className="mt-1 font-display text-base font-black tabular-nums text-[#233128]">
            {formatearBob(perfil.presupuestoBob)}
          </dd>
        </div>

        <div className="bg-[#FFFDF8] px-3.5 py-3">
          <dt className="font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8A8177]">
            Tiempo
          </dt>
          <dd className="mt-1 font-display text-base font-black tabular-nums text-[#233128]">
            {formatearTiempo(perfil)}
          </dd>
        </div>

        <div className="bg-[#FFFDF8] px-3.5 py-3">
          <dt className="font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8A8177]">
            Salida
          </dt>
          <dd className="mt-1 truncate font-display text-base font-black text-[#233128]">
            {etiquetaPuntoPartida(perfil)}
          </dd>
        </div>

        <div className="bg-[#FFFDF8] px-3.5 py-3">
          <dt className="font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8A8177]">
            Radio · Top-K
          </dt>
          <dd className="mt-1 font-display text-base font-black tabular-nums text-[#233128]">
            {perfil.radioKm} km · {perfil.topK}
          </dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="recomendaciones-macrodistrito"
            className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#8D4F32]"
          >
            Punto de partida
          </label>

          <select
            id="recomendaciones-macrodistrito"
            value={perfil.macrodistrito}
            disabled={pendiente}
            onChange={(evento) =>
              onCambiar(conMacrodistrito(perfil, evento.target.value))
            }
            className="mt-2 w-full border border-[#5B3A29]/25 bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#233128] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A5B3C] disabled:opacity-60"
          >
            <option value="">Punto guardado</option>
            {MACRODISTRITOS_LA_PAZ.map((macrodistrito) => (
              <option key={macrodistrito.nombre} value={macrodistrito.nombre}>
                {macrodistrito.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="recomendaciones-radio"
              className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#8D4F32]"
            >
              Radio
            </label>

            <select
              id="recomendaciones-radio"
              value={perfil.radioKm}
              disabled={pendiente}
              onChange={(evento) =>
                onCambiar({ ...perfil, radioKm: Number(evento.target.value) })
              }
              className="mt-2 w-full border border-[#5B3A29]/25 bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#233128] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A5B3C] disabled:opacity-60"
            >
              {RECOMENDACIONES_POR_DEFECTO.radiosKm.map((radio) => (
                <option key={radio} value={radio}>
                  {radio} km
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="recomendaciones-top-k"
              className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#8D4F32]"
            >
              Top-K
            </label>

            <select
              id="recomendaciones-top-k"
              value={perfil.topK}
              disabled={pendiente}
              onChange={(evento) =>
                onCambiar({ ...perfil, topK: Number(evento.target.value) })
              }
              className="mt-2 w-full border border-[#5B3A29]/25 bg-[#FFFDF8] px-3 py-2.5 text-sm font-semibold text-[#233128] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A5B3C] disabled:opacity-60"
            >
              {RECOMENDACIONES_POR_DEFECTO.topKs.map((topK) => (
                <option key={topK} value={topK}>
                  {topK} destinos
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 border-t border-[#5B3A29]/15 pt-6 sm:grid-cols-2">
        <SliderPresupuesto
          valor={perfil.presupuestoBob}
          onChange={(presupuestoBob) =>
            onCambiar({ ...perfil, presupuestoBob })
          }
          disabled={pendiente}
        />

        <SelectorDuracion
          valor={perfil.duracionValor}
          unidad={perfil.duracionUnidad}
          onValor={(duracionValor) =>
            onCambiar({ ...perfil, duracionValor })
          }
          onUnidad={(duracionUnidad) =>
            onCambiar({
              ...perfil,
              duracionUnidad,
              duracionValor: convertirUnidad(perfil, duracionUnidad),
            })
          }
          disabled={pendiente}
        />
      </div>
    </form>
  );
}
