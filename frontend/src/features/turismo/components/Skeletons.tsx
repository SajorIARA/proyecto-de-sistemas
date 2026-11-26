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
      className="flex h-full flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
      data-testid="destino-card-skeleton"
      aria-hidden="true"
    >
      <div className="flex h-[3px] shrink-0 overflow-hidden">
        <span className="flex-1 bg-[var(--color-brand)]/20" />
        <span className="flex-1 bg-[var(--color-route)]/20" />
        <span className="flex-1 bg-[var(--color-action)]/20" />
        <span className="flex-1 bg-[var(--color-action)]/20" />
      </div>

      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[var(--color-border)]">
        <div className="absolute left-4 top-4 h-7 w-28 bg-[var(--color-text)]/12" />

        <Pulso />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <Pulso className="h-5 w-3/4" />
        <Pulso className="mt-3 h-3.5 w-1/2" />
        <Pulso className="mt-5 h-3 w-full" />
        <Pulso className="mt-2 h-3 w-11/12" />
        <Pulso className="mt-2 h-3 w-2/3" />

        <div className="mt-auto pt-6">
          <div className="h-12 w-full animate-pulse bg-[var(--color-surface-muted)]" />
        </div>
      </div>
    </div>
  );
}

/** Bloque gris animado. */
function Pulso({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[var(--color-border)] ${className}`}
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

      <div className="h-4 w-32 animate-pulse bg-[var(--color-border)]" />

      <div className="mt-8 aspect-[16/9] w-full animate-pulse bg-[var(--color-border)]" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="h-9 w-2/3 animate-pulse bg-[var(--color-border)]" />
          <div className="mt-3 h-4 w-1/3 animate-pulse bg-[var(--color-border)]" />
          <div className="mt-8 space-y-3">
            <div className="h-3.5 w-full animate-pulse bg-[var(--color-border)]" />
            <div className="h-3.5 w-full animate-pulse bg-[var(--color-border)]" />
            <div className="h-3.5 w-4/5 animate-pulse bg-[var(--color-border)]" />
            <div className="h-3.5 w-2/3 animate-pulse bg-[var(--color-border)]" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-56 w-full animate-pulse bg-[var(--color-border)]" />
          <div className="h-40 w-full animate-pulse bg-[var(--color-border)]" />
        </div>
      </div>
    </div>
  );
}
