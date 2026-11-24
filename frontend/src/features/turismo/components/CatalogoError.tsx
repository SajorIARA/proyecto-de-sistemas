/**
 * Estado de error del catálogo con botón de reintento.
 *
 * Cubre fallos de red y respuestas 4xx/5xx del backend sin dejar que la
 * cuadrícula se quede en blanco. Mantiene el rol `alert` para que el fallo
 * se anuncie de inmediato.
 */

interface CatalogoErrorProps {
  onReintentar: () => void;
  mensaje?: string;
}

export function CatalogoError({
  onReintentar,
  mensaje = "No pudimos cargar el catálogo de destinos.",
}: CatalogoErrorProps) {
  return (
    <div
      className="grid gap-6 border-y border-[#9A5B3C]/30 py-14 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10 sm:py-16"
      role="alert"
      data-testid="catalogo-error"
    >
      <p
        className="font-display text-[5.5rem] font-black leading-[0.8] tracking-[-0.08em] text-[#9A5B3C]/25 sm:text-[7rem]"
        aria-hidden="true"
      >
        !
      </p>

      <div className="max-w-2xl">
        <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
          Error de conexión
        </p>

        <h3 className="mt-3 font-display text-2xl font-black leading-tight tracking-[-0.03em] text-[#233128] sm:text-[1.6rem]">
          Algo salió mal
        </h3>

        <p className="mt-4 text-sm leading-7 text-[#514B43]">
          {mensaje} Revisa tu conexión a internet e inténtalo de nuevo. Si el
          problema continúa, vuelve a intentarlo en unos momentos.
        </p>

        <button
          type="button"
          onClick={onReintentar}
          className="mt-7 inline-flex min-h-11 items-center gap-3 border-b-2 border-[#233128] pb-1 text-xs font-black uppercase tracking-[0.16em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
        >
          Reintentar
          <span aria-hidden="true">↻</span>
        </button>
      </div>
    </div>
  );
}
