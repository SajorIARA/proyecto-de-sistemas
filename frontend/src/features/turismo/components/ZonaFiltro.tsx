/**
 * Filtro de zona geográfica del catálogo.
 *
 * Se envía como el query param `zona` del backend, que resuelve un `icontains`
 * sobre la dirección del destino. "Todas las zonas" es el estado inicial y no
 * envía parámetro.
 */

import { useId } from "react";
import { Icono } from "../../../components/site/Iconos";
import { ZONAS_LA_PAZ } from "../../../config/turismo";

interface ZonaFiltroProps {
  /** Zona seleccionada, o `null` para "Todas las zonas". */
  seleccionada: string | null;
  onChange: (zona: string | null) => void;
  /** Lista de zonas; por defecto las oficiales del catálogo. */
  zonas?: readonly string[];
  disabled?: boolean;
}

export function ZonaFiltro({
  seleccionada,
  onChange,
  zonas = ZONAS_LA_PAZ,
  disabled = false,
}: ZonaFiltroProps) {
  const id = useId();

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Zona
      </label>

      <select
        id={id}
        value={seleccionada ?? ""}
        onChange={(evento) => onChange(evento.target.value || null)}
        disabled={disabled}
        className="min-h-12 w-full appearance-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-10 text-sm font-bold text-[var(--color-text-muted)] transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <option value="">Todas las zonas</option>

        {zonas.map((zona) => (
          <option key={zona} value={zona}>
            {zona}
          </option>
        ))}
      </select>

      <span
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        aria-hidden="true"
      >
        <Icono nombre="flecha" className="h-4 w-4 rotate-90" />
      </span>
    </div>
  );
}
