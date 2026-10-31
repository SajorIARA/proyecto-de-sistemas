/**
 * Banner de rutas gastronómicas.
 *
 * Una sola fotografía a sangre con tipografía editorial, al estilo de
 * las portadas de revista: el acento serif hace de contrapunto de los
 * titulares geométricos del resto de la página.
 */

import { Link } from "react-router-dom";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { Icono } from "../../components/site/Iconos";

const SABORES = [
  "Plato paceño",
  "Salteñas",
  "Api con pastel",
  "Mercado Rodríguez",
] as const;

export function GastronomiaBanner() {
  return (
    <section
      id="gastronomia"
      className="relative scroll-mt-24 overflow-hidden bg-[#101710] py-24 text-[#FFFDF8] sm:py-32"
    >
      <img
        src={IMAGENES_SITIO.gastronomia}
        alt="Interior cálido de un restaurante paceño"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-[#0B110C]/78" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(198,146,59,0.22),transparent_55%)]" />

      <div className="contenedor-sitio relative">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#F1D79D] backdrop-blur-md">
            <Icono nombre="utensilios" className="h-3.5 w-3.5" />
            Sabores de altura
          </p>

          <h2 className="font-editorial mt-7 text-[clamp(2.8rem,6.5vw,5.2rem)] font-normal leading-[0.95] tracking-[-0.02em]">
            Rutas <em className="italic text-[#E8C16A]">gastronómicas</em>
          </h2>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#F3EBDD]/75 sm:text-lg">
            La cocina paceña mezcla la despensa del altiplano con las
            tradiciones de valle. Recorre mercados, fondas y restaurantes que
            cuentan la ciudad a través de sus platos.
          </p>

          <ul className="mt-8 flex flex-wrap gap-2">
            {SABORES.map((sabor) => (
              <li
                key={sabor}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-[#F3EBDD]/85 backdrop-blur-sm"
              >
                {sabor}
              </li>
            ))}
          </ul>

          <Link
            to="/destinos?categoria=Gastronom%C3%ADa"
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-[#E8C16A] px-6 py-3.5 text-sm font-black text-[#1B241D] transition hover:bg-[#F3D68F]"
          >
            Descubrir gastronomía
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B241D] text-[#E8C16A] transition-transform group-hover:translate-x-0.5">
              <Icono nombre="flecha" className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
