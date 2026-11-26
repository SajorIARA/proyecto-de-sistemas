import { Icono } from "../components/site/Iconos";
import { ButtonLink } from "../design-system/components/Button";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-canvas)] px-5 py-12 text-center">
      <div className="lp-panel w-full max-w-xl px-7 py-12 sm:px-12">
        <span className="mx-auto grid h-14 w-14 place-items-center bg-[var(--color-text)] text-[var(--lp-night)]">
          <Icono nombre="brujula" className="h-7 w-7" />
        </span>
        <p className="mt-7 font-data text-sm font-bold text-[var(--color-action-hover)]">
          Error 404 · Ruta no encontrada
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          Esta parada no está disponible
        </h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">
          La página que buscas no existe, cambió de dirección o ya no está
          publicada.
        </p>
        <ButtonLink to="/" variante="primary" className="mt-8">
          Volver al inicio
          <Icono nombre="flecha" className="h-4 w-4" />
        </ButtonLink>
      </div>
    </main>
  );
}
