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
      className="rounded-[1.75rem] border border-[var(--color-border)]/[0.09] bg-[var(--color-surface)] p-5 shadow-[0_18px_50px_rgba(72,55,38,0.07)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-brand)]">
            <Icono nombre="brujula" className="h-6 w-6" />
          </span>

          <div>
            <h2 className="text-lg font-black tracking-tight text-[var(--color-text)]">
              Tu perfil de búsqueda
            </h2>
            <p className="mt-1 max-w-md text-xs leading-6 text-[var(--color-text-muted)]">
              La afinidad combina tus intereses, el presupuesto, el tiempo
              disponible y la distancia desde tu punto de partida.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pendiente}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-route-strong)] px-5 py-3 text-sm font-black text-[var(--color-text)] shadow-[0_10px_24px_rgba(47,75,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--color-route-strong)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Icono
            nombre="actualizar"
            className={`h-4 w-4 ${pendiente ? "animate-spin" : ""}`}
          />
          {pendiente ? "Actualizando…" : "Actualizar ranking"}
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-[var(--color-surface-muted)] px-3.5 py-3">
          <dt className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Presupuesto
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[var(--color-text)]">
            {formatearBob(perfil.presupuestoBob)}
          </dd>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface-muted)] px-3.5 py-3">
          <dt className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Tiempo
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[var(--color-text)]">
            {formatearTiempo(perfil)}
          </dd>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface-muted)] px-3.5 py-3">
          <dt className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Salida
          </dt>
          <dd className="mt-1 truncate text-sm font-black text-[var(--color-text)]">
            {etiquetaPuntoPartida(perfil)}
          </dd>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface-muted)] px-3.5 py-3">
          <dt className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Radio · Top-K
          </dt>
          <dd className="mt-1 text-sm font-black tabular-nums text-[var(--color-text)]">
            {perfil.radioKm} km · {perfil.topK}
          </dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="recomendaciones-macrodistrito"
            className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-brand)]"
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
            className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:opacity-60"
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
              className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-brand)]"
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
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:opacity-60"
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
              className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-brand)]"
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
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:opacity-60"
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

      <div className="mt-6 grid gap-6 border-t border-[var(--color-border)]/[0.08] pt-6 sm:grid-cols-2">
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
