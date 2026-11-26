/**
 * Cierre de la portada: una tarjeta a sangre con fotografía y el
 * llamado a crear cuenta o volver al panel personal.
 */

import { Link } from "react-router-dom";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { useAuth } from "../../features/auth/context/AuthContext";
import { Icono } from "../../components/site/Iconos";

export function CtaFinal() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="bg-[var(--color-surface)] px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="contenedor-sitio">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--color-surface)] px-6 py-12 text-center text-[var(--color-text)] sm:px-10 sm:py-16">
          <img
            src={IMAGENES_SITIO.cierre.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-[var(--color-surface)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(198,146,59,0.25),transparent_60%)]" />

          <div className="relative mx-auto max-w-2xl">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-action)]">
              Tu próxima experiencia empieza aquí
            </p>

            <h2 className="font-display mt-5 text-[clamp(2.2rem,5vw,3.8rem)] font-black leading-[0.98] tracking-[-0.04em]">
              Guarda tus lugares y arma{" "}
              <span className="font-editorial font-normal italic text-[var(--color-action)]">
                tu propia ruta
              </span>
              .
            </h2>

            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[var(--color-text)] sm:text-base">
              Crea una cuenta para organizar favoritos, ajustar tus
              preferencias de viaje y volver al catálogo sin perder lo que
              encontraste.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={isAuthenticated ? "/mi-cuenta" : "/registro"}
                className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-action)] px-6 py-3.5 text-sm font-black text-[var(--lp-night)] transition hover:bg-[var(--color-surface-muted)]"
              >
                {isAuthenticated ? "Ir a mi cuenta" : "Crear mi cuenta"}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-action)] transition-transform group-hover:translate-x-0.5">
                  <Icono nombre="flecha" className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
