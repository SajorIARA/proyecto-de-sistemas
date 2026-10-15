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
          className="inline-flex items-center gap-2 rounded-full border border-[#2F4B3B]/25 bg-[#2F4B3B]/[0.08] py-1.5 pl-3.5 pr-2 text-xs font-black text-[#2F4B3B]"
        >
          {chip.etiqueta}

          <button
            type="button"
            onClick={chip.onQuitar}
            aria-label={`Quitar filtro ${chip.etiqueta}`}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2F4B3B]/12 text-[0.7rem] leading-none text-[#2F4B3B] transition hover:bg-[#2F4B3B]/25"
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onLimpiar}
        className="text-xs font-black text-[#8D4F32] underline-offset-4 transition hover:underline"
      >
        Limpiar todo
      </button>
    </div>
  );
}
