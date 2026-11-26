/**
 * Resumen de filtros activos del catálogo.
 *
 * Cada filtro se muestra como una "píldora" removible individualmente, más un
 * botón para limpiarlos todos. Hace visible la **combinación** de filtros y da
 * una salida rápida sin tener que recordar qué control movió cada uno.
 */

export interface ChipFiltroActivo {
  clave: string;
  etiqueta: string;
  onQuitar: () => void;
}

interface FiltrosActivosProps {
  chips: ChipFiltroActivo[];
  onLimpiar: () => void;
}

export function FiltrosActivos({ chips, onLimpiar }: FiltrosActivosProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filtros activos"
    >
      <span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Filtros
      </span>

      {chips.map((chip) => (
        <span
          key={chip.clave}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-route-strong)]/[0.08] py-1.5 pl-3.5 pr-1.5 text-xs font-black text-[var(--color-brand)]"
        >
          <span className="truncate">{chip.etiqueta}</span>

          <button
            type="button"
            onClick={chip.onQuitar}
            aria-label={`Quitar filtro ${chip.etiqueta}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-route-strong)] text-[0.8rem] leading-none text-[var(--color-text)] transition hover:bg-[var(--color-route-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onLimpiar}
        className="inline-flex min-h-9 items-center rounded-full px-2 text-xs font-black text-[var(--color-brand)] underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
      >
        Limpiar todo
      </button>
    </div>
  );
}
