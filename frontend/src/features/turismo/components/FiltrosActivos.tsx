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
      <span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
        Filtros
      </span>

      {chips.map((chip) => (
        <span
          key={chip.clave}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#2F4B3B]/25 bg-[#2F4B3B]/[0.08] py-1.5 pl-3.5 pr-1.5 text-xs font-black text-[#2F4B3B]"
        >
          <span className="truncate">{chip.etiqueta}</span>

          <button
            type="button"
            onClick={chip.onQuitar}
            aria-label={`Quitar filtro ${chip.etiqueta}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2F4B3B]/12 text-[0.8rem] leading-none text-[#2F4B3B] transition hover:bg-[#2F4B3B]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onLimpiar}
        className="inline-flex min-h-9 items-center rounded-full px-2 text-xs font-black text-[#8D4F32] underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
      >
        Limpiar todo
      </button>
    </div>
  );
}
