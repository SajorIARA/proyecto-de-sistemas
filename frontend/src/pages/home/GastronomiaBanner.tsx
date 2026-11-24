/**
 * Rutas gastronómicas.
 *
 * Una fotografía de mercado y, montada encima, una carta de papel con
 * los platos que cuentan la ciudad. El desfase y la sombra plana imitan
 * la impresión de un menú de fonda, en contraste con las líneas finas
 * del resto de la portada.
 */

import { Link } from "react-router-dom";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { Icono } from "../../components/site/Iconos";

const PLATOS = [
  { nombre: "Plato paceño", nota: "choclo, habas y queso frito" },
  { nombre: "Salteñas", nota: "media mañana, recién horneadas" },
  { nombre: "Api con pastel", nota: "para empezar el día" },
] as const;

export function GastronomiaBanner() {
  return (
    <section
      id="gastronomia"
      className="scroll-mt-24 bg-[#F3EBDD] py-20 sm:py-28"
    >
      <div className="contenedor-sitio">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-0">
          <div className="lg:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#233128] sm:aspect-[16/10]">
              <img
                src={IMAGENES_SITIO.gastronomia.src}
                alt={IMAGENES_SITIO.gastronomia.alt}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101710]/55 via-transparent to-transparent" />
              <p className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[#FFFDF8]/75">
                Mercado Rodríguez · La Paz
              </p>
            </div>
          </div>

          <div className="relative z-10 bg-[#FFFDF8] px-6 py-8 shadow-[10px_10px_0_0_rgba(154,91,60,0.85)] sm:px-10 sm:py-10 lg:col-span-5 lg:-ml-16">
            <div className="flex items-center justify-between gap-4 border-b border-dashed border-[#5B3A29]/30 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9A5B3C]">
                Rutas de mesa
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#746D63]">
                La Paz · BO
              </p>
            </div>

            <h2 className="font-editorial mt-6 text-[clamp(2.6rem,4.2vw,3.6rem)] leading-[0.98] tracking-[-0.02em] text-[#233128]">
              La ciudad también{" "}
              <em className="italic text-[#9A5B3C]">se come</em>.
            </h2>

            <p className="mt-4 text-sm leading-6 text-[#5C574E]">
              La cocina paceña mezcla la despensa del altiplano con las
              tradiciones de valle. Mercados, fondas y restaurantes cuentan la
              ciudad a través de sus platos.
            </p>

            <ul className="mt-6 border-t border-[#5B3A29]/15">
              {PLATOS.map((plato) => (
                <li
                  key={plato.nombre}
                  className="flex items-baseline justify-between gap-4 border-b border-[#5B3A29]/15 py-3"
                >
                  <span className="text-sm font-bold text-[#233128]">
                    {plato.nombre}
                  </span>
                  <span className="text-right text-xs text-[#746D63]">
                    {plato.nota}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/destinos?categoria=Gastronom%C3%ADa"
              className="group mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#9A5B3C]"
            >
              Ver gastronomía en el catálogo
              <Icono
                nombre="flecha"
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
