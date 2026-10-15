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
        className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8A8177]"
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
                "rounded-full border px-3.5 py-2 text-xs font-black transition duration-200",
                "disabled:cursor-not-allowed disabled:opacity-55",
                activo
                  ? "border-[#9A5B3C] bg-[#9A5B3C] text-[#FFFDF8] shadow-[0_8px_22px_rgba(154,91,60,0.25)]"
                  : "border-[#5B3A29]/15 bg-[#FFFDF8]/80 text-[#514B43] hover:border-[#9A5B3C]/45 hover:text-[#8D4F32]",
              ].join(" ")}
            >
              {rangoPrecio.etiqueta}
            </button>
          );
        })}
      </div>

      {rango && (rango.min !== null || rango.max !== null) && (
        <p className="text-xs font-semibold text-[#8A8177]" aria-live="polite">
          El catálogo va de {formatearLimite(rango.min)} a{" "}
          {formatearLimite(rango.max)}
        </p>
      )}

      {!rango && tienePrecio && (
        <p className="text-xs font-semibold text-[#8A8177]">
          {formatearLimite(precioMin)} – {formatearLimite(precioMax)}
        </p>
      )}
    </div>
  );
}
