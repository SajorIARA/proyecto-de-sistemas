/**
 * Filtro de zona geográfica del catálogo.
 *
 * Se envía como el query param `zona` del backend, que resuelve un `icontains`
 * sobre la dirección del destino. "Todas las zonas" es el estado inicial y no
 * envía parámetro. El control se integra en el riel con una línea inferior,
 * en lugar de un select redondeado.
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
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]"
      >
        Zona
      </label>

      <div className="relative">
        <select
          id={id}
          value={seleccionada ?? ""}
          onChange={(evento) => onChange(evento.target.value || null)}
          disabled={disabled}
          className="min-h-11 w-full appearance-none border-0 border-b border-[#5B3A29]/25 bg-transparent py-2.5 pl-0 pr-8 text-sm font-semibold text-[#233128] transition hover:border-[#2F4B3B]/40 focus:border-[#2F4B3B] focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <option value="">Todas las zonas</option>

          {zonas.map((zona) => (
            <option key={zona} value={zona}>
              {zona}
            </option>
          ))}
        </select>

        <span
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#9A5B3C]"
          aria-hidden="true"
        >
          <Icono nombre="flecha" className="h-3.5 w-3.5 rotate-90" />
        </span>
      </div>
    </div>
  );
}
