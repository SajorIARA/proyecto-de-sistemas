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
        "inline-flex items-center gap-2 border px-3.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition duration-200",
        "disabled:cursor-not-allowed disabled:opacity-55",
        activo
          ? "border-[#233128] bg-[#233128] text-[#FFFDF8]"
          : "border-[#5B3A29]/15 bg-[#FFFDF8] text-[#514B43] hover:border-[#9A5B3C]/45 hover:text-[#8D4F32]",
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-sm leading-none">
        {INSIGNIA_CATEGORIA[categoria.nombre] ?? "📍"}
      </span>

      {categoria.nombre}

      <span
        aria-hidden="true"
        className={[
          "text-[0.6rem] leading-none text-[#E8C16A] transition-opacity",
          activo ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        ✓
      </span>
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
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8A8177]">
        Cargando categorías…
      </p>
    );
  }

  if (errorCarga) {
    return (
      <p
        role="alert"
        className="border-l-2 border-[#9A5B3C]/50 bg-[#F6E8DF]/60 px-4 py-3 text-sm font-semibold leading-6 text-[#713A2A]"
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
        className="flex flex-wrap gap-2"
      >
        {categorias.length === 0 && (
          <p className="border border-dashed border-[#5B3A29]/20 px-4 py-4 text-sm text-[#746D63]">
            Aún no hay categorías publicadas en el catálogo.
          </p>
        )}

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

      <p
        aria-live="polite"
        className="mt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8A8177]"
      >
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
