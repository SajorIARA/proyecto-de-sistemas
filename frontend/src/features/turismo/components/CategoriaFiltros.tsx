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
import { ICONO_CATEGORIA } from "./CategoriaBadge";
import { Icono, type NombreIcono } from "../../../components/site/Iconos";

interface CategoriaFiltrosProps {
  /** Categoría seleccionada, o `null` para "Todos". */
  seleccionada: string | null;
  onChange: (categoria: string | null) => void;
  /** Conteos por categoría (opcional) para mostrar en el chip. */
  conteos?: Record<string, number>;
  disabled?: boolean;
  /** Distribuye todos los controles en varias filas, útil en paneles laterales. */
  apilado?: boolean;
}

export function CategoriaFiltros({
  seleccionada,
  onChange,
  conteos,
  disabled = false,
  apilado = false,
}: CategoriaFiltrosProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar catálogo por categoría"
      className={
        apilado
          ? "flex flex-wrap items-center gap-2 pb-1 pt-0.5"
          : "flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
      }
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
          icono={ICONO_CATEGORIA[categoria]}
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
  icono?: NombreIcono;
  conteo?: number;
  disabled?: boolean;
}

function Chip({
  etiqueta,
  activo,
  onClick,
  icono,
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
        "inline-flex min-h-11 shrink-0 items-center gap-2 border px-4 py-2.5 text-xs font-black transition duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-55",
        activo
          ? "border-[var(--color-brand)] bg-[var(--color-route-strong)] text-[var(--color-text)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-brand)]",
      ].join(" ")}
    >
      {icono && <Icono nombre={icono} className="h-4 w-4" />}

      {etiqueta}

      {typeof conteo === "number" && (
        <span
          className={[
            "px-1.5 py-0.5 font-data text-xs font-black",
            activo ? "bg-white/20 text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text)]",
          ].join(" ")}
        >
          {conteo}
        </span>
      )}
    </button>
  );
}
