/**
 * Filtro de rango de precio en bolivianos.
 *
 * Se resuelve con presets (no con un doble slider) porque cada preset es una
 * combinación concreta de `precio_min` / `precio_max`, que es exactamente lo
 * que entiende el backend sobre las tarifas del destino. El preset activo se
 * deduce del par min/max, de modo que un enlace con valores arbitrarios también
 * se refleja correctamente (sin marcar ningún preset si no coincide).
 */

import { useId } from "react";
import { RANGOS_PRECIO_BOB } from "../../../config/turismo";

interface RangoPrecioFiltroProps {
  precioMin: number | null;
  precioMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
  /** Rango real del catálogo (facetas), solo como pista visual. */
  rango?: { min: number | null; max: number | null } | null;
  disabled?: boolean;
}

/** "Bs 120" · "sin límite" para los extremos del rango. */
function formatearLimite(valor: number | null): string {
  if (valor === null) {
    return "sin límite";
  }

  return `Bs ${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 2,
  }).format(valor)}`;
}

export function RangoPrecioFiltro({
  precioMin,
  precioMax,
  onChange,
  rango = null,
  disabled = false,
}: RangoPrecioFiltroProps) {
  const tienePrecio = precioMin !== null || precioMax !== null;
  const idEtiqueta = useId();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        id={idEtiqueta}
        className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
      >
        Precio (BOB)
      </span>

      <div
        role="group"
        aria-labelledby={idEtiqueta}
        className="flex flex-wrap items-center gap-2"
      >
        {RANGOS_PRECIO_BOB.map((rangoPrecio) => {
          const activo =
            rangoPrecio.min === precioMin && rangoPrecio.max === precioMax;

          return (
            <button
              key={rangoPrecio.id}
              type="button"
              onClick={() => onChange(rangoPrecio.min, rangoPrecio.max)}
              disabled={disabled}
              aria-pressed={activo}
              data-testid={`rango-precio-${rangoPrecio.id}`}
              className={[
                "inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 text-xs font-black transition duration-200",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]",
                "disabled:cursor-not-allowed disabled:opacity-55",
                activo
                  ? "border-[var(--color-brand)] bg-[var(--color-action)] text-[var(--lp-night)] shadow-[0_8px_22px_rgba(154,91,60,0.25)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
              ].join(" ")}
            >
              {rangoPrecio.etiqueta}
            </button>
          );
        })}
      </div>

      {rango && (rango.min !== null || rango.max !== null) && (
        <p className="text-xs font-semibold text-[var(--color-text-muted)]" aria-live="polite">
          El catálogo va de {formatearLimite(rango.min)} a{" "}
          {formatearLimite(rango.max)}
        </p>
      )}

      {!rango && tienePrecio && (
        <p className="text-xs font-semibold text-[var(--color-text-muted)]">
          {formatearLimite(precioMin)} – {formatearLimite(precioMax)}
        </p>
      )}
    </div>
  );
}
