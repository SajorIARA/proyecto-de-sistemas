/**
 * Filtro de zona geográfica del catálogo.
 *
 * Se envía como el query param `zona` del backend, que resuelve un `icontains`
 * sobre la dirección del destino. "Todas" es el estado inicial y no envía
 * parámetro.
 */

import { useId } from "react";
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
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8A8177]"
      >
        Zona
      </label>

      <select
        id={id}
        value={seleccionada ?? ""}
        onChange={(evento) => onChange(evento.target.value || null)}
        disabled={disabled}
        className="rounded-full border border-[#5B3A29]/15 bg-[#FFFDF8] px-4 py-2.5 text-xs font-black text-[#514B43] transition hover:border-[#2F4B3B]/40 focus:border-[#2F4B3B] focus:outline-none disabled:cursor-not-allowed disabled:opacity-55"
      >
        <option value="">Todas las zonas</option>

        {zonas.map((zona) => (
          <option key={zona} value={zona}>
            {zona}
          </option>
        ))}
      </select>
    </div>
  );
}
