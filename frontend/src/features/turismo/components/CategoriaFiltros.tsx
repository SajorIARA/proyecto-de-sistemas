/**
 * Índice de categorías del catálogo.
 *
 * Se presenta como una lista editorial con el conteo a la derecha, no como
 * una fila de píldoras. "Todos" es el estado inicial y no envía filtro al
 * backend. La lista mantiene el orden oficial del Product Owner y sigue
 * siendo un grupo de botones con `aria-pressed` para teclado y lectores.
 */

import {
  CATEGORIAS_OFICIALES,
  CATEGORIA_TODOS,
} from "../../../config/turismo";

interface CategoriaFiltrosProps {
  /** Categoría seleccionada, o `null` para "Todos". */
  seleccionada: string | null;
  onChange: (categoria: string | null) => void;
  /** Conteos por categoría (opcional) para mostrar en la fila. */
  conteos?: Record<string, number>;
  /** Total de destinos del catálogo, para la fila "Todos". */
  conteoTotal?: number;
  disabled?: boolean;
}

export function CategoriaFiltros({
  seleccionada,
  onChange,
  conteos,
  conteoTotal,
  disabled = false,
}: CategoriaFiltrosProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar catálogo por categoría"
      className="grid grid-cols-2 gap-x-5 sm:grid-cols-3 lg:grid-cols-1 lg:gap-x-0"
    >
      <Fila
        etiqueta={CATEGORIA_TODOS}
        activo={seleccionada === null}
        conteo={conteoTotal}
        onClick={() => onChange(null)}
        disabled={disabled}
      />

      {CATEGORIAS_OFICIALES.map((categoria) => (
        <Fila
          key={categoria}
          etiqueta={categoria}
          activo={seleccionada === categoria}
          conteo={conteos?.[categoria]}
          onClick={() => onChange(categoria)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface FilaProps {
  etiqueta: string;
  activo: boolean;
  onClick: () => void;
  conteo?: number;
  disabled?: boolean;
}

function Fila({
  etiqueta,
  activo,
  onClick,
  conteo,
  disabled = false,
}: FilaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      className={[
        "flex min-h-11 w-full items-baseline justify-between gap-3 border-b border-[#5B3A29]/12 py-2.5 text-left transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]",
        "disabled:cursor-not-allowed disabled:opacity-55",
        activo
          ? "text-[#9A5B3C]"
          : "text-[#514B43] hover:text-[#233128]",
      ].join(" ")}
    >
      <span
        className={
          activo
            ? "font-editorial text-[1.08rem] font-normal italic"
            : "text-[0.82rem] font-semibold"
        }
      >
        {etiqueta}
      </span>

      {typeof conteo === "number" && (
        <span
          className={[
            "font-mono text-[10px] tabular-nums",
            activo ? "text-[#9A5B3C]" : "text-[#8A8177]",
          ].join(" ")}
        >
          {conteo}
        </span>
      )}
    </button>
  );
}
