/**
 * "La Paz por zonas": las seis zonas que el backend reconoce en
 * `direccion` (`ZONAS_LA_PAZ`). Se presentan como un itinerario de líneas
 * finas sobre fondo andino, sin fotografías, para dar ritmo entre las
 * secciones claras y no prometer imágenes que el catálogo todavía no
 * tiene.
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
      className="relative scroll-mt-24 overflow-hidden bg-[#1B241D] py-20 text-[#F3EBDD] sm:py-28"
    >
      <div
        className="trama-topografica pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />

      <div className="contenedor-sitio relative">
        <header className="grid gap-8 border-b border-[#E9DFC9]/20 pb-9 lg:grid-cols-12 lg:items-end">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#E8C16A] lg:col-span-2">
            La Paz por zonas
            <span className="mt-1 block text-[#F3EBDD]/40">06 barrios</span>
          </p>

          <h2 className="font-display text-[clamp(2.6rem,5.4vw,4.6rem)] font-black leading-[0.94] tracking-[-0.05em] text-[#FFFDF8] lg:col-span-7">
            La ciudad,{" "}
            <span className="font-editorial font-normal italic text-[#E8C16A]">
              barrio por barrio
            </span>
            .
          </h2>

          <p className="max-w-md text-sm leading-7 text-[#F3EBDD]/60 sm:text-base lg:col-span-3 lg:pb-2">
            La ciudad se recorre por barrios. Elige una zona para ver solo los
            atractivos registrados en ella.
          </p>
        </header>

        <ul>
          {ZONAS_LA_PAZ.map((zona, indice) => (
            <li key={zona}>
              <Link
                to={`/destinos?zona=${encodeURIComponent(zona)}`}
                className="group grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-4 border-b border-[#E9DFC9]/15 py-6 transition-colors hover:bg-[#F3EBDD]/[0.05] sm:grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-3"
              >
                <span className="mt-1 font-mono text-[10px] tracking-[0.2em] text-[#E8C16A]/60 sm:mt-0">
                  {String(indice + 1).padStart(2, "0")}
                </span>

                <div>
                  <h3 className="font-display text-2xl font-black tracking-[-0.03em] text-[#FFFDF8] transition-colors group-hover:text-[#E8C16A] sm:text-3xl">
                    {zona}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#F3EBDD]/55 sm:hidden">
                    {DESCRIPCIONES[zona]}
                  </p>
                </div>

                <p className="hidden text-sm leading-6 text-[#F3EBDD]/55 sm:block">
                  {DESCRIPCIONES[zona]}
                </p>

                <span className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#E8C16A] sm:flex sm:opacity-50 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                  Explorar
                  <Icono nombre="flecha" className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F3EBDD]/35">
            Las zonas filtran la dirección registrada en el catálogo
          </p>

          <Link
            to="/destinos"
            className="group inline-flex items-center gap-2 text-sm font-bold text-[#F3EBDD]/75 transition hover:text-[#FFFDF8]"
          >
            Ver todos los destinos
            <Icono
              nombre="flecha"
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
