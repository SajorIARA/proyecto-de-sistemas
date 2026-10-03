/**
 * Estado de error del catálogo con botón de reintento.
 *
 * Cubre fallos de red y respuestas 4xx/5xx del backend sin dejar que la
 * cuadrícula se quede en blanco.
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
      className="rounded-[2rem] border border-[#9A5B3C]/25 bg-[#FFFDF8] px-6 py-16 text-center"
      role="alert"
      data-testid="catalogo-error"
    >
      <span
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#9A5B3C]/12 text-3xl"
        aria-hidden="true"
      >
        📡
      </span>

      <h3 className="mt-6 text-xl font-black tracking-tight text-[#233128]">
        Algo salió mal
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#514B43]">
        {mensaje} Revisa tu conexión a internet e inténtalo de nuevo.
      </p>

      <button
        type="button"
        onClick={onReintentar}
        className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128]"
      >
        Reintentar
        <span aria-hidden="true">↻</span>
      </button>
    </div>
  );
}
