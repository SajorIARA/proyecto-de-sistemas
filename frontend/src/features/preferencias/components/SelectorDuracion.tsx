/**
 * Selector de duración de la visita.
 *
 * El turista elige la unidad (horas o días) y la cantidad con un slider, y
 * puede usar presets. El total se normaliza siempre a horas al guardar, que
 * es lo que entiende `ConsultaRecomendacion.tiempo_horas`.
 */

import { useId } from "react";
import { DURACION, limitesDuracion } from "../../../config/preferencias";
import type { UnidadDuracion } from "../../../types/preferencias";
import {
  duracionAHoras,
  formatearDuracion,
} from "../utils/validaciones";

interface SelectorDuracionProps {
  valor: number;
  unidad: UnidadDuracion;
  onValor: (valor: number) => void;
  onUnidad: (unidad: UnidadDuracion) => void;
  error?: string | null;
  disabled?: boolean;
}

const UNIDADES: { id: UnidadDuracion; etiqueta: string }[] = [
  { id: "horas", etiqueta: "Horas" },
  { id: "dias", etiqueta: "Días" },
];

export function SelectorDuracion({
  valor,
  unidad,
  onValor,
  onUnidad,
  error = null,
  disabled = false,
}: SelectorDuracionProps) {
  const id = useId();
  const idError = `${id}-error`;
  const limites = limitesDuracion(unidad);
  const horasTotales = duracionAHoras(valor, unidad);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]">
          Duración de la visita
        </span>

        {/* Unidad */}
        <div
          role="group"
          aria-label="Unidad de duración"
          className="inline-flex rounded-full border border-[#5B3A29]/15 bg-[#F3EBDD]/60 p-1"
        >
          {UNIDADES.map((opcion) => {
            const activo = unidad === opcion.id;

            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => onUnidad(opcion.id)}
                disabled={disabled}
                aria-pressed={activo}
                data-testid={`unidad-${opcion.id}`}
                className={[
                  "rounded-full px-4 py-1.5 text-xs font-black transition",
                  "disabled:cursor-not-allowed disabled:opacity-55",
                  activo
                    ? "bg-[#233128] text-[#FFFDF8]"
                    : "text-[#514B43] hover:text-[#233128]",
                ].join(" ")}
              >
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      <p
        aria-live="polite"
        className="mt-3 text-lg font-black tabular-nums text-[#233128]"
      >
        {formatearDuracion(valor, unidad)}
        <span className="ml-2 text-xs font-bold text-[#8A8177]">
          ({horasTotales} {horasTotales === 1 ? "hora" : "horas"})
        </span>
      </p>

      <label htmlFor={id} className="sr-only">
        Cantidad de {unidad === "dias" ? "días" : "horas"}
      </label>

      <input
        id={id}
        type="range"
        min={limites.min}
        max={limites.max}
        step={limites.paso}
        value={valor}
        disabled={disabled}
        onChange={(evento) => onValor(Number(evento.target.value))}
        aria-valuetext={formatearDuracion(valor, unidad)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? idError : undefined}
        data-testid="slider-duracion"
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-55"
      />

      <div className="mt-1.5 flex justify-between text-[0.65rem] font-bold text-[#8A8177]">
        <span>{limites.min}</span>
        <span>{limites.max}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
          Rápido
        </span>

        {limites.presets.map((preset) => {
          const activo = valor === preset;

          return (
            <button
              key={preset}
              type="button"
              onClick={() => onValor(preset)}
              disabled={disabled}
              aria-pressed={activo}
              className={[
                "rounded-full border px-3.5 py-1.5 text-xs font-black transition",
                "disabled:cursor-not-allowed disabled:opacity-55",
                activo
                  ? "border-[#2F4B3B] bg-[#2F4B3B] text-[#FFFDF8]"
                  : "border-[#5B3A29]/15 bg-[#FFFDF8]/80 text-[#514B43] hover:border-[#2F4B3B]/40 hover:text-[#233128]",
              ].join(" ")}
            >
              {formatearDuracion(preset, unidad)}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-[#746D63]">
        Duración máxima admitida: {DURACION.maxHoras} horas.
      </p>

      {error && (
        <p
          id={idError}
          role="alert"
          className="mt-1 text-xs font-semibold text-[#9A3B2E]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
