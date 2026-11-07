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
        className="w-full appearance-none rounded-2xl border border-[#5B3A29]/15 bg-[#FFFDF8] px-4 py-3 pr-10 text-sm font-bold text-[#514B43] transition hover:border-[#2F4B3B]/40 focus:border-[#2F4B3B] focus:outline-none focus:ring-2 focus:ring-[#2F4B3B]/15 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <option value="">Todas las zonas</option>

        {zonas.map((zona) => (
          <option key={zona} value={zona}>
            {zona}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8177]">
        <Icono nombre="chevronAbajo" className="h-4 w-4" />
      </span>
    </div>
  );
}
