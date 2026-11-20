/**
 * Esqueletos de carga del catálogo.
 *
 * `DestinoCardSkeleton` reproduce la silueta de la ficha fotográfica para que
 * la cuadrícula no dé un salto de layout cuando lleguen los datos.
 * `DetalleSkeleton` sigue el ritmo de la ficha de detalle.
 */

export function DestinoCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col"
      data-testid="destino-card-skeleton"
      aria-hidden="true"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#5B3A29]/[0.08]">
        <div className="absolute left-3 top-3 h-6 w-24 bg-[#FFFDF8]/60" />
        <div className="absolute inset-0 animate-pulse bg-[#5B3A29]/[0.06]" />
      </div>

      <div className="border-b border-[#5B3A29]/12 pb-6 pt-4">
        <div className="h-7 w-3/4 animate-pulse bg-[#5B3A29]/[0.09]" />
        <div className="mt-3 h-2.5 w-1/2 animate-pulse bg-[#5B3A29]/[0.07]" />
        <div className="mt-4 h-3 w-full animate-pulse bg-[#5B3A29]/[0.07]" />
        <div className="mt-2 h-3 w-11/12 animate-pulse bg-[#5B3A29]/[0.07]" />
        <div className="mt-6 flex items-center justify-between">
          <div className="h-2.5 w-20 animate-pulse bg-[#5B3A29]/[0.07]" />
          <div className="h-2.5 w-16 animate-pulse bg-[#9A5B3C]/15" />
        </div>
      </div>
    </div>
  );
}

/**
 * Bloque de carga para el detalle del destino: galería + panel lateral.
 */
export function DetalleSkeleton() {
  return (
    <div role="status" aria-live="polite" data-testid="detalle-skeleton">
      <span className="sr-only">Cargando información del destino…</span>

      <div className="h-4 w-32 animate-pulse bg-[#5B3A29]/[0.09]" />

      <div className="mt-8 aspect-[16/9] w-full animate-pulse bg-[#5B3A29]/[0.08]" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="h-9 w-2/3 animate-pulse bg-[#5B3A29]/[0.09]" />
          <div className="mt-3 h-4 w-1/3 animate-pulse bg-[#5B3A29]/[0.09]" />
          <div className="mt-8 space-y-3">
            <div className="h-3.5 w-full animate-pulse bg-[#5B3A29]/[0.09]" />
            <div className="h-3.5 w-full animate-pulse bg-[#5B3A29]/[0.09]" />
            <div className="h-3.5 w-4/5 animate-pulse bg-[#5B3A29]/[0.09]" />
            <div className="h-3.5 w-2/3 animate-pulse bg-[#5B3A29]/[0.09]" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-56 w-full animate-pulse bg-[#5B3A29]/[0.08]" />
          <div className="h-40 w-full animate-pulse bg-[#5B3A29]/[0.08]" />
        </div>
      </div>
    </div>
  );
}
