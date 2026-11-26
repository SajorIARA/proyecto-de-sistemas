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
          className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-brand)]"
        >
          Presupuesto tope
        </label>

        <output
          htmlFor={id}
          aria-live="polite"
          className="text-lg font-black tabular-nums text-[var(--color-text)]"
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
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full accent-[#9A5B3C] disabled:cursor-not-allowed disabled:opacity-55"
        style={{
          background: `linear-gradient(90deg, #9A5B3C ${progreso}%, #E9DFC9 ${progreso}%)`,
        }}
      />

      <div className="mt-1.5 flex justify-between text-[0.65rem] font-bold text-[var(--color-text-muted)]">
        <span>{formatearBob(PRESUPUESTO_BOB.min)}</span>
        <span>{formatearBob(PRESUPUESTO_BOB.max)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
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
                "rounded-full border px-3.5 py-1.5 text-xs font-black transition",
                "disabled:cursor-not-allowed disabled:opacity-55",
                activo
                  ? "border-[var(--color-brand)] bg-[var(--color-action)] text-[var(--lp-night)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
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
          className="mt-2 text-xs font-semibold text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
