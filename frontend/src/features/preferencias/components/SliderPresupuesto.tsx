/**
 * Control deslizante del presupuesto tope en bolivianos.
 *
 * El slider y los presets escriben el mismo número, de modo que ambos son
 * accesibles con teclado. El valor actual se refleja en un `<output>` con
 * `aria-live="polite"` para dar feedback inmediato en cada movimiento.
 */

import { useId } from "react";
import { PRESUPUESTO_BOB } from "../../../config/preferencias";
import { formatearBob } from "../utils/validaciones";

interface SliderPresupuestoProps {
  valor: number;
  onChange: (valor: number) => void;
  error?: string | null;
  disabled?: boolean;
}

export function SliderPresupuesto({
  valor,
  onChange,
  error = null,
  disabled = false,
}: SliderPresupuestoProps) {
  const id = useId();
  const idError = `${id}-error`;
  const progreso =
    ((valor - PRESUPUESTO_BOB.min) /
      (PRESUPUESTO_BOB.max - PRESUPUESTO_BOB.min)) *
    100;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#8D4F32]"
        >
          Presupuesto tope
        </label>

        <output
          htmlFor={id}
          aria-live="polite"
          className="font-display text-2xl font-black tabular-nums tracking-[-0.02em] text-[#233128]"
        >
          {formatearBob(valor)}
        </output>
      </div>

      <input
        id={id}
        type="range"
        min={PRESUPUESTO_BOB.min}
        max={PRESUPUESTO_BOB.max}
        step={PRESUPUESTO_BOB.paso}
        value={valor}
        disabled={disabled}
        onChange={(evento) => onChange(Number(evento.target.value))}
        aria-valuetext={formatearBob(valor)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? idError : undefined}
        data-testid="slider-presupuesto"
        className="rango-editorial mt-4 h-1.5 w-full cursor-pointer appearance-none text-[#9A5B3C] disabled:cursor-not-allowed disabled:opacity-55"
        style={{
          background: `linear-gradient(90deg, #9A5B3C ${progreso}%, #E9DFC9 ${progreso}%)`,
        }}
      />

      <div className="mt-2 flex justify-between font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#8A8177]">
        <span>{formatearBob(PRESUPUESTO_BOB.min)}</span>
        <span>{formatearBob(PRESUPUESTO_BOB.max)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#8A8177]">
          Rápido
        </span>

        {PRESUPUESTO_BOB.presets.map((preset) => {
          const activo = valor === preset;

          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              disabled={disabled}
              aria-pressed={activo}
              className={[
                "border px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] transition",
                "disabled:cursor-not-allowed disabled:opacity-55",
                activo
                  ? "border-[#9A5B3C] bg-[#9A5B3C] text-[#FFFDF8]"
                  : "border-[#5B3A29]/15 bg-[#FFFDF8] text-[#514B43] hover:border-[#9A5B3C]/45 hover:text-[#8D4F32]",
              ].join(" ")}
            >
              {formatearBob(preset)}
            </button>
          );
        })}
      </div>

      {error && (
        <p
          id={idError}
          role="alert"
          className="mt-2 text-xs font-semibold text-[#9A3B2E]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
