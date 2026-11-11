/**
 * Filtro de categorías del catálogo.
 *
 * Chips: Todos + las 6 categorías oficiales del Product Owner, siempre
 * visibles en el orden definido (Aventura, Gastronomía, Cultura, Miradores,
 * Naturaleza, Arqueología). "Todos" es el estado inicial y no envía filtro
 * al backend.
 *
 * Se implementa como grupo de botones con `aria-pressed` para que el
 * filtro sea usable con teclado y announced correctamente.
 */

import {
  CATEGORIAS_OFICIALES,
  CATEGORIA_TODOS,
} from "../../../config/turismo";
import { INSIGNIA_CATEGORIA } from "./CategoriaBadge";

interface CategoriaFiltrosProps {
  /** Categoría seleccionada, o `null` para "Todos". */
  seleccionada: string | null;
  onChange: (categoria: string | null) => void;
  /** Conteos por categoría (opcional) para mostrar en el chip. */
  conteos?: Record<string, number>;
  disabled?: boolean;
}

export function CategoriaFiltros({
  seleccionada,
  onChange,
  conteos,
  disabled = false,
}: CategoriaFiltrosProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar catálogo por categoría"
      className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
    >
      <Chip
        etiqueta={CATEGORIA_TODOS}
        activo={seleccionada === null}
        onClick={() => onChange(null)}
        disabled={disabled}
      />

      {CATEGORIAS_OFICIALES.map((categoria) => (
        <Chip
          key={categoria}
          etiqueta={categoria}
          insignia={INSIGNIA_CATEGORIA[categoria]}
          activo={seleccionada === categoria}
          conteo={conteos?.[categoria]}
          onClick={() => onChange(categoria)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface ChipProps {
  etiqueta: string;
  activo: boolean;
  onClick: () => void;
  insignia?: string;
  conteo?: number;
  disabled?: boolean;
}

function Chip({
  etiqueta,
  activo,
  onClick,
  insignia,
  conteo,
  disabled = false,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      className={[
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black transition duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]",
        "disabled:cursor-not-allowed disabled:opacity-55",
        activo
          ? "border-[#2F4B3B] bg-[#2F4B3B] text-[#FFFDF8] shadow-[0_8px_22px_rgba(47,75,59,0.28)]"
          : "border-[#5B3A29]/15 bg-[#FFFDF8]/90 text-[#514B43] hover:border-[#2F4B3B]/40 hover:bg-[#FFFDF8] hover:text-[#233128]",
      ].join(" ")}
    >
      {insignia && (
        <span aria-hidden="true" className="text-sm leading-none">
          {insignia}
        </span>
      )}

      {etiqueta}

      {typeof conteo === "number" && (
        <span
          className={[
            "rounded-full px-1.5 py-0.5 text-[0.6rem] font-black tabular-nums",
            activo ? "bg-[#FFFDF8]/20 text-[#FFFDF8]" : "bg-[#C6923B]/18 text-[#8D4F32]",
          ].join(" ")}
        >
          {conteo}
        </span>
      )}
    </button>
  );
}
