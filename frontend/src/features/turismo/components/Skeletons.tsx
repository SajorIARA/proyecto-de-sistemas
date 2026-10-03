/**
 * Esqueleto de carga (skeleton) de la card de destino.
 *
 * Reproduce la silueta exacta de `DestinoCard` para que la cuadrícula no
 * dé un salto de layout cuando lleguen los datos. Se anuncia a lectores
 * de pantalla con `role="status"` y un texto solo para assistive tech.
 */

export function DestinoCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[1.85rem] border border-[#5B3A29]/[0.06] bg-[#FFFDF8] shadow-[0_16px_40px_rgba(72,55,38,0.06)]"
      data-testid="destino-card-skeleton"
    >
      <div className="flex h-[3px] shrink-0 overflow-hidden">
        <span className="flex-1 bg-[#2F4B3B]/20" />
        <span className="flex-1 bg-[#C6923B]/20" />
        <span className="flex-1 bg-[#9A5B3C]/20" />
        <span className="flex-1 bg-[#6F8064]/20" />
      </div>

      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#E9DFC9]">
        <div className="absolute left-4 top-4 h-7 w-28 rounded-full bg-[#263029]/15" />

        <Pulso />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <Pulso className="h-5 w-3/4" />
        <Pulso className="mt-3 h-3.5 w-1/2" />
        <Pulso className="mt-5 h-3 w-full" />
        <Pulso className="mt-2 h-3 w-11/12" />
        <Pulso className="mt-2 h-3 w-2/3" />

        <div className="mt-6 h-[50px] w-full rounded-full bg-[#2F4B3B]/15" />
      </div>
    </div>
  );
}

/** Bloque gris animado. */
function Pulso({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#5B3A29]/[0.09] ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Bloque de carga para el detalle del destino: galería + panel lateral.
 * Mismo lenguaje visual que el skeleton de la card.
 */
export function DetalleSkeleton() {
  return (
    <div role="status" aria-live="polite" data-testid="detalle-skeleton">
      <span className="sr-only">Cargando información del destino…</span>

      <div className="h-4 w-32 animate-pulse rounded-full bg-[#5B3A29]/[0.09]" />

      <div className="mt-8 aspect-[16/9] w-full animate-pulse rounded-[2rem] bg-[#E9DFC9]" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="h-9 w-2/3 animate-pulse rounded-lg bg-[#5B3A29]/[0.09]" />
          <div className="mt-3 h-4 w-1/3 animate-pulse rounded-full bg-[#5B3A29]/[0.09]" />
          <div className="mt-8 space-y-3">
            <div className="h-3.5 w-full animate-pulse rounded-full bg-[#5B3A29]/[0.09]" />
            <div className="h-3.5 w-full animate-pulse rounded-full bg-[#5B3A29]/[0.09]" />
            <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-[#5B3A29]/[0.09]" />
            <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-[#5B3A29]/[0.09]" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-56 w-full animate-pulse rounded-[1.6rem] bg-[#E9DFC9]" />
          <div className="h-40 w-full animate-pulse rounded-[1.6rem] bg-[#E9DFC9]" />
        </div>
      </div>
    </div>
  );
}
