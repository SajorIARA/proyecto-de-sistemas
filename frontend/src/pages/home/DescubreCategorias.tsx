/**
 * "Descubre La Paz": las seis categorías oficiales del catálogo como
 * tarjetas fotográficas. Cada tarjeta enlaza al catálogo ya filtrado,
 * así que la portada y el listado comparten los mismos parámetros.
 */

import { Link } from "react-router-dom";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { Icono, type NombreIcono } from "../../components/site/Iconos";

type CategoriaPortada = keyof typeof IMAGENES_SITIO.categorias;

interface CategoriaTarjeta {
  nombre: CategoriaPortada;
  descripcion: string;
  icono: NombreIcono;
}

const CATEGORIAS: readonly CategoriaTarjeta[] = [
  {
    nombre: "Aventura",
    descripcion: "Cumbres, senderos y deportes de altura.",
    icono: "montana",
  },
  {
    nombre: "Gastronomía",
    descripcion: "Mercados, platos típicos y cocina de altura.",
    icono: "utensilios",
  },
  {
    nombre: "Cultura",
    descripcion: "Museos, iglesias y patrimonio vivo.",
    icono: "museo",
  },
  {
    nombre: "Miradores",
    descripcion: "La hoyada vista desde sus balcones naturales.",
    icono: "camara",
  },
  {
    nombre: "Naturaleza",
    descripcion: "Valles, bosques y paisajes andinos.",
    icono: "hoja",
  },
  {
    nombre: "Arqueología",
    descripcion: "Huellas de las culturas ancestrales del altiplano.",
    icono: "estrella",
  },
];

export function DescubreCategorias() {
  return (
    <section
      id="descubre"
      className="scroll-mt-24 bg-[#F3EBDD] py-20 sm:py-28"
    >
      <div className="contenedor-sitio">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#9A5B3C]">
              Descubre La Paz
            </p>

            <h2 className="font-display mt-5 text-[clamp(2.4rem,5vw,4.2rem)] font-black leading-[0.98] tracking-[-0.045em] text-[#233128]">
              Seis formas de{" "}
              <span className="font-editorial font-normal italic text-[#9A5B3C]">
                sentir
              </span>{" "}
              la ciudad.
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-[#5C574E] sm:text-base">
            Cada categoría reúne atractivos registrados en el catálogo
            turístico. Elige una y combina después zona, precio y búsqueda por
            texto.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS.map((categoria, indice) => (
            <li key={categoria.nombre}>
              <Link
                to={`/destinos?categoria=${encodeURIComponent(categoria.nombre)}`}
                className="group relative block h-full overflow-hidden rounded-[1.5rem] bg-[#233128] shadow-[0_18px_45px_rgba(72,55,38,0.16)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_70px_rgba(72,55,38,0.28)]"
              >
                <div className="aspect-[4/5] w-full overflow-hidden sm:aspect-[3/4]">
                  <img
                    src={IMAGENES_SITIO.categorias[categoria.nombre]}
                    alt={`Atractivos de ${categoria.nombre} en La Paz`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.07]"
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-[#101710] via-[#101710]/35 to-transparent" />

                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/25 text-[#F3EBDD] backdrop-blur-md">
                    <Icono nombre={categoria.icono} className="h-5 w-5" />
                  </span>

                  <span className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#F3EBDD]/55">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <h3 className="text-2xl font-black tracking-[-0.02em] text-[#FFFDF8]">
                    {categoria.nombre}
                  </h3>

                  <p className="mt-2 max-w-[18rem] text-sm leading-6 text-[#F3EBDD]/70">
                    {categoria.descripcion}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#E8C16A]">
                    Explorar
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      <Icono nombre="flecha" className="h-4 w-4" />
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex justify-center">
          <Link
            to="/destinos"
            className="inline-flex items-center gap-3 rounded-full border border-[#2F4B3B]/25 bg-[#FFFDF8] px-7 py-3.5 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] hover:bg-[#2F4B3B] hover:text-[#FFFDF8]"
          >
            Ver todos los destinos
            <Icono nombre="flecha" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
