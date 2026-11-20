/**
 * Cierre de la portada como una postal: fotografía a la izquierda,
 * mensaje y sello de franqueo a la derecha. Mantiene el llamado a crear
 * cuenta o volver al panel personal.
 */

import { Link } from "react-router-dom";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { useAuth } from "../../features/auth/context/AuthContext";
import { Icono } from "../../components/site/Iconos";

export function CtaFinal() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="bg-[#F3EBDD] px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="contenedor-sitio">
        <div className="border border-[#5B3A29]/25 bg-[#FFFDF8]">
          <div className="grid lg:grid-cols-[5fr_7fr]">
            <div className="relative min-h-[280px] overflow-hidden bg-[#233128] lg:min-h-[440px]">
              <img
                src={IMAGENES_SITIO.cierre.src}
                alt={IMAGENES_SITIO.cierre.alt}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[#101710]/25" />
              <p className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[#FFFDF8]/80">
                La Paz al atardecer
              </p>
            </div>

            <div className="relative p-7 sm:p-12 lg:p-14">
              <div
                aria-hidden="true"
                className="absolute right-6 top-6 hidden h-20 w-16 rotate-3 border border-dashed border-[#9A5B3C]/50 p-1.5 sm:block"
              >
                <div className="flex h-full flex-col items-center justify-center gap-1 border border-[#9A5B3C]/25">
                  <Icono nombre="montana" className="h-4 w-4 text-[#9A5B3C]" />
                  <span className="text-center font-mono text-[8px] uppercase leading-3 tracking-[0.14em] text-[#9A5B3C]">
                    La Paz
                    <br />
                    BO 2026
                  </span>
                </div>
              </div>

              <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#9A5B3C]">
                Última parada
              </p>

              <h2 className="font-editorial mt-5 max-w-md text-[clamp(2.4rem,4.4vw,3.8rem)] leading-[0.98] tracking-[-0.02em] text-[#233128]">
                Tu ruta empieza por{" "}
                <em className="italic text-[#9A5B3C]">una cuenta</em>.
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-[#5C574E]">
                Guarda tus favoritos, ajusta tus preferencias de viaje y vuelve
                al catálogo sin perder lo que encontraste.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link
                  to={isAuthenticated ? "/mi-cuenta" : "/registro"}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#233128] px-6 py-3.5 text-sm font-black text-[#FFFDF8] transition hover:bg-[#2F4B3B]"
                >
                  {isAuthenticated ? "Ir a mi cuenta" : "Crear mi cuenta"}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8C16A] text-[#1B241D] transition-transform group-hover:translate-x-0.5">
                    <Icono nombre="flecha" className="h-4 w-4" />
                  </span>
                </Link>

                <Link
                  to="/destinos"
                  className="group inline-flex items-center gap-2 border-b border-[#5B3A29]/30 pb-1 text-sm font-bold text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#9A5B3C]"
                >
                  Ver el catálogo
                  <Icono
                    nombre="flecha"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>

              <p className="font-editorial mt-10 text-lg italic text-[#9A5B3C]/80">
                La Paz te espera a 3.640 metros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
