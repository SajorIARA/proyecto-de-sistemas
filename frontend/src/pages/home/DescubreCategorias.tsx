/**
 * "Descubre La Paz": las seis categorías oficiales del catálogo como un
 * índice tipográfico. Al pasar el cursor (o navegar con teclado) por una
 * fila, la fotografía de esa categoría ocupa el panel derecho. Cada fila
 * enlaza al catálogo ya filtrado.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { Icono } from "../../components/site/Iconos";

type CategoriaPortada = keyof typeof IMAGENES_SITIO.categorias;

interface CategoriaTarjeta {
  nombre: CategoriaPortada;
  descripcion: string;
}

const CATEGORIAS: readonly CategoriaTarjeta[] = [
  {
    nombre: "Aventura",
    descripcion: "Cumbres, senderos y deportes de altura.",
  },
  {
    nombre: "Gastronomía",
    descripcion: "Mercados, fondas y platos de la despensa andina.",
  },
  {
    nombre: "Cultura",
    descripcion: "Iglesias coloniales, museos y patrimonio vivo.",
  },
  {
    nombre: "Miradores",
    descripcion: "Balcones naturales sobre la hoyada.",
  },
  {
    nombre: "Naturaleza",
    descripcion: "Valles, formaciones de arcilla y paisajes de altura.",
  },
  {
    nombre: "Arqueología",
    descripcion: "Tiwanaku y las huellas del altiplano prehispánico.",
  },
];

export function DescubreCategorias() {
  const [activa, setActiva] = useState(0);

  return (
    <section
      id="descubre"
      className="scroll-mt-24 bg-[#F3EBDD] py-20 sm:py-28"
    >
      <div className="contenedor-sitio">
        <header className="grid gap-8 border-b border-[#5B3A29]/15 pb-9 lg:grid-cols-12 lg:items-end">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#9A5B3C] lg:col-span-2">
            Índice
            <span className="mt-1 block text-[#746D63]">01 — 06</span>
          </p>

          <h2 className="font-display text-[clamp(2.6rem,5.4vw,4.6rem)] font-black leading-[0.94] tracking-[-0.05em] text-[#233128] lg:col-span-7">
            Seis maneras de recorrer la{" "}
            <span className="font-editorial font-normal italic text-[#9A5B3C]">
              hoyada
            </span>
            .
          </h2>

          <p className="max-w-md text-sm leading-7 text-[#5C574E] sm:text-base lg:col-span-3 lg:pb-2">
            La ciudad cambia según cómo la mires. Elige una categoría y el
            catálogo se abre ya filtrado.
          </p>
        </header>

        <div className="grid gap-12 pt-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <ul className="divide-y divide-[#5B3A29]/15">
            {CATEGORIAS.map((categoria, indice) => {
              const foto = IMAGENES_SITIO.categorias[categoria.nombre];

              return (
                <li key={categoria.nombre}>
                  <Link
                    to={`/destinos?categoria=${encodeURIComponent(categoria.nombre)}`}
                    onMouseEnter={() => setActiva(indice)}
                    onFocus={() => setActiva(indice)}
                    className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-4 py-6 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-6"
                  >
                    <span className="pt-1 font-mono text-[10px] tracking-[0.2em] text-[#9A5B3C]">
                      {String(indice + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0">
                      <h3 className="font-display text-[clamp(1.6rem,3vw,2.3rem)] font-black leading-none tracking-[-0.035em] text-[#233128] transition-colors group-hover:text-[#9A5B3C]">
                        {categoria.nombre}
                      </h3>

                      <p className="mt-2 max-w-md text-sm leading-6 text-[#746D63]">
                        {categoria.descripcion}
                      </p>

                      <span className="mt-4 block h-20 overflow-hidden bg-[#233128] sm:hidden">
                        <img
                          src={foto.src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </span>
                    </div>

                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#5B3A29]/20 text-[#2F4B3B] transition-colors group-hover:border-[#9A5B3C] group-hover:bg-[#9A5B3C] group-hover:text-[#FFFDF8]">
                      <Icono nombre="flecha" className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#233128]">
                {CATEGORIAS.map((categoria, indice) => (
                  <img
                    key={categoria.nombre}
                    src={IMAGENES_SITIO.categorias[categoria.nombre].src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={[
                      "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                      indice === activa ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  />
                ))}

                <div className="absolute inset-0 bg-gradient-to-t from-[#101710]/80 via-[#101710]/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#E8C16A]">
                      Categoría{" "}
                      {String(activa + 1).padStart(2, "0")}
                    </p>
                    <p className="font-display mt-1 text-2xl font-black text-[#FFFDF8]">
                      {CATEGORIAS[activa].nombre}
                    </p>
                  </div>

                  <p className="max-w-[12rem] text-right text-xs leading-5 text-[#F3EBDD]/65">
                    {CATEGORIAS[activa].descripcion}
                  </p>
                </div>
              </div>

              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#746D63]">
                Pasa el cursor por el índice
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[#5B3A29]/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-[#746D63]">
            Las seis categorías oficiales del catálogo turístico. Después
            puedes afinar por zona, precio o búsqueda por texto.
          </p>

          <Link
            to="/destinos"
            className="group inline-flex items-center gap-2 text-sm font-black text-[#233128] underline decoration-[#9A5B3C]/40 decoration-2 underline-offset-8 transition hover:decoration-[#9A5B3C]"
          >
            Ver todo el catálogo
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
