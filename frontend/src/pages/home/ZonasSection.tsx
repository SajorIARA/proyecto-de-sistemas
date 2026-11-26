/**
 * "La Paz por zonas": las seis zonas que el backend reconoce en
 * `direccion` (`ZONAS_LA_PAZ`). Se presentan como tarjetas tipográficas
 * sobre fondo andino, sin fotografías, para dar ritmo entre dos
 * secciones claras y evitar prometer imágenes que el catálogo todavía
 * no tiene.
 */

import { Link } from "react-router-dom";
import { ZONAS_LA_PAZ } from "../../config/turismo";
import { Icono } from "../../components/site/Iconos";

const DESCRIPCIONES: Record<string, string> = {
  Centro:
    "Iglesias coloniales, museos y el pulso del casco histórico paceño.",
  "San Francisco":
    "El corazón bohemio alrededor de la basílica, sus plazas y mercados.",
  Sopocachi:
    "Cafés, galerías y miradores urbanos en la ladera de la hoyada.",
  Miraflores:
    "Parques, cultura y vistas abiertas hacia las montañas.",
  Mallasa:
    "Valle de la Luna, senderos y un clima más templado.",
  "Zona Sur":
    "Arquitectura moderna y avenidas al pie del Illimani.",
};

export function ZonasSection() {
  return (
    <section
      id="zonas"
      className="relative scroll-mt-24 overflow-hidden bg-[var(--color-surface)] py-14 text-[var(--color-text)] sm:py-20"
    >
      <div
        className="trama-topografica pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      />

      <span
        aria-hidden="true"
        className="font-display pointer-events-none absolute -bottom-10 right-0 select-none text-[22vw] font-black leading-none tracking-[-0.08em] text-[var(--color-text)]/[0.03]"
      >
        LA PAZ
      </span>

      <div className="contenedor-sitio relative">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-action)]">
              La Paz por zonas
            </p>

            <h2 className="font-display mt-5 text-[clamp(2.4rem,5vw,4.2rem)] font-black leading-[0.98] tracking-[-0.045em] text-[var(--color-text)]">
              Cada zona tiene su{" "}
              <span className="font-editorial font-normal italic text-[var(--color-action)]">
                propio ritmo
              </span>
              .
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-[var(--color-text)] sm:text-base">
            La ciudad se recorre por barrios. Elige una zona para ver solo los
            atractivos que el catálogo registra en ella.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZONAS_LA_PAZ.map((zona, indice) => (
            <li key={zona}>
              <Link
                to={`/destinos?zona=${encodeURIComponent(zona)}`}
                className="group flex h-full flex-col justify-between rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-action)] hover:bg-[var(--color-surface-muted)]/[0.08]"
              >
                <div className="flex items-start justify-between">
                  <span className="font-editorial text-4xl italic leading-none text-[var(--color-action)]">
                    {String(indice + 1).padStart(2, "0")}
                  </span>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-action)]">
                    <Icono nombre="ubicacion" className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-10">
                  <h3 className="font-display text-2xl font-black tracking-[-0.02em] text-[var(--color-text)]">
                    {zona}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[var(--color-text)]">
                    {DESCRIPCIONES[zona]}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[var(--color-action)]">
                    Explorar zona
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      <Icono nombre="flecha" className="h-4 w-4" />
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
