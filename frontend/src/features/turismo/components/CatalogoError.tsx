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
      className="rounded-[2rem] border border-[#9A5B3C]/25 bg-[#FFFDF8] px-5 py-14 text-center sm:px-6 sm:py-16"
      role="alert"
      data-testid="catalogo-error"
    >
      <span
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#9A5B3C]/12 text-3xl"
        aria-hidden="true"
      >
        ↻
      </span>

      <h3 className="mt-6 text-xl font-black tracking-tight text-[#233128] sm:text-[1.35rem]">
        Algo salió mal
      </h3>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#514B43]">
        {mensaje} Revisa tu conexión a internet e inténtalo de nuevo. Si el problema continúa, vuelve a intentarlo en unos momentos.
      </p>

      <button
        type="button"
        onClick={onReintentar}
        className="mt-7 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
      >
        Reintentar
        <span aria-hidden="true">↻</span>
      </button>
    </div>
  );
}
