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
    <div>
      <p
        id={idEtiqueta}
        className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]"
      >
        Precio (BOB)
      </p>

      <div
        role="group"
        aria-labelledby={idEtiqueta}
        className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1"
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
                "inline-flex min-h-9 items-center border-b py-1 text-xs font-semibold transition",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]",
                "disabled:cursor-not-allowed disabled:opacity-55",
                activo
                  ? "border-[#9A5B3C] text-[#9A5B3C]"
                  : "border-transparent text-[#514B43] hover:border-[#2F4B3B]/25 hover:text-[#233128]",
              ].join(" ")}
            >
              {rangoPrecio.etiqueta}
            </button>
          );
        })}
      </div>

      {rango && (rango.min !== null || rango.max !== null) && (
        <p className="mt-2 text-[11px] leading-5 text-[#8A8177]" aria-live="polite">
          El catálogo va de {formatearLimite(rango.min)} a{" "}
          {formatearLimite(rango.max)}
        </p>
      )}

      {!rango && tienePrecio && (
        <p className="mt-2 text-[11px] leading-5 text-[#8A8177]">
          {formatearLimite(precioMin)} – {formatearLimite(precioMax)}
        </p>
      )}
    </div>
  );
}
