/**
 * Chips de categorías temáticas (selección múltiple).
 *
 * Cada chip es un botón con `aria-pressed`, dentro de un `role="group"`, para
 * que la selección sea usable con teclado y se anuncie correctamente. El
 * contador usa `aria-live="polite"` y da feedback inmediato sin mover el foco.
 *
 * Las categorías vienen del backend (`/api/turismo/categorias/`), no de una
 * lista fija: así el formulario sigue funcionando si el catálogo cambia.
 */

import { INSIGNIA_CATEGORIA } from "../../turismo/components/CategoriaBadge";
import type { Categoria } from "../../../types/turismo";

interface ChipsCategoriasProps {
  categorias: Categoria[];
  seleccionadas: number[];
  onToggle: (id: number) => void;
  cargando?: boolean;
  errorCarga?: string | null;
  errorValidacion?: string | null;
  disabled?: boolean;
}

function Chip({
  categoria,
  activo,
  onClick,
  disabled,
}: {
  categoria: Categoria;
  activo: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      data-testid={`chip-categoria-${categoria.id_categoria}`}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black transition duration-200",
        "disabled:cursor-not-allowed disabled:opacity-55",
        activo
          ? "border-[#2F4B3B] bg-[#2F4B3B] text-[#FFFDF8] shadow-[0_8px_22px_rgba(47,75,59,0.28)]"
          : "border-[#5B3A29]/15 bg-[#FFFDF8]/80 text-[#514B43] hover:border-[#2F4B3B]/40 hover:bg-[#FFFDF8] hover:text-[#233128]",
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-sm leading-none">
        {INSIGNIA_CATEGORIA[categoria.nombre] ?? "📍"}
      </span>

      {categoria.nombre}

      {activo && (
        <span aria-hidden="true" className="text-[0.65rem] leading-none">
          ✓
        </span>
      )}
    </button>
  );
}

export function ChipsCategorias({
  categorias,
  seleccionadas,
  onToggle,
  cargando = false,
  errorCarga = null,
  errorValidacion = null,
  disabled = false,
}: ChipsCategoriasProps) {
  if (cargando) {
    return (
      <p className="text-sm font-semibold text-[#746D63]">
        Cargando categorías…
      </p>
    );
  }

  if (errorCarga) {
    return (
      <p
        role="alert"
        className="rounded-2xl border border-[#9A3B2E]/25 bg-[#9A3B2E]/[0.07] px-4 py-3 text-sm font-semibold text-[#9A3B2E]"
      >
        {errorCarga}
      </p>
    );
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Categorías temáticas de interés"
        className="flex flex-wrap gap-2.5"
      >
        {categorias.map((categoria) => (
          <Chip
            key={categoria.id_categoria}
            categoria={categoria}
            activo={seleccionadas.includes(categoria.id_categoria)}
            onClick={() => onToggle(categoria.id_categoria)}
            disabled={disabled}
          />
        ))}
      </div>

      <p aria-live="polite" className="mt-3 text-xs font-semibold text-[#746D63]">
        {seleccionadas.length === 0
          ? "Ninguna categoría seleccionada todavía."
          : `${seleccionadas.length} ${
              seleccionadas.length === 1
                ? "categoría seleccionada"
                : "categorías seleccionadas"
            }.`}
      </p>

      {errorValidacion && (
        <p role="alert" className="mt-1 text-xs font-semibold text-[#9A3B2E]">
          {errorValidacion}
        </p>
      )}
    </div>
  );
}
