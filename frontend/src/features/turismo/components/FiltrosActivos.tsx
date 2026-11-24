/**
 * Resumen de filtros activos del catálogo.
 *
 * Cada filtro se muestra como una anotación removible individualmente, más un
 * enlace para limpiarlos todos. Hace visible la combinación de filtros y da
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
      className="flex flex-col items-start gap-3"
      role="group"
      aria-label="Filtros activos"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]">
          Activos
        </span>

        {chips.map((chip) => (
          <span
            key={chip.clave}
            className="inline-flex max-w-full items-center gap-1.5 border-b border-[#9A5B3C]/40 pb-0.5 text-xs font-semibold text-[#8D4F32]"
          >
            <span className="truncate">{chip.etiqueta}</span>

            <button
              type="button"
              onClick={chip.onQuitar}
              aria-label={`Quitar filtro ${chip.etiqueta}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center text-sm leading-none text-[#8D4F32] transition hover:bg-[#9A5B3C]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onLimpiar}
        className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8D4F32] underline decoration-[#8D4F32]/35 underline-offset-4 transition hover:decoration-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
      >
        Limpiar todo
      </button>
    </div>
  );
}
