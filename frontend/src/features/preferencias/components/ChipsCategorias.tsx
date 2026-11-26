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

import { ICONO_CATEGORIA } from "../../turismo/components/CategoriaBadge";
import { Icono } from "../../../components/site/Iconos";
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
        "inline-flex min-h-11 items-center gap-2 border px-4 py-2.5 text-xs font-black transition duration-200",
        "disabled:cursor-not-allowed disabled:opacity-55",
        activo
          ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--lp-night)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-brand)]",
      ].join(" ")}
    >
      <Icono
        nombre={ICONO_CATEGORIA[categoria.nombre] ?? "ubicacion"}
        className="h-4 w-4"
      />

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
       <p className="text-sm font-semibold text-[var(--color-text-muted)]">
        Cargando categorías…
      </p>
    );
  }

  if (errorCarga) {
    return (
      <p
        role="alert"
        className="border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-danger)]"
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

      <p aria-live="polite" className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">
        {seleccionadas.length === 0
          ? "Ninguna categoría seleccionada todavía."
          : `${seleccionadas.length} ${
              seleccionadas.length === 1
                ? "categoría seleccionada"
                : "categorías seleccionadas"
            }.`}
      </p>

      {errorValidacion && (
        <p role="alert" className="mt-1 text-xs font-semibold text-[var(--color-danger)]">
          {errorValidacion}
        </p>
      )}
    </div>
  );
}
