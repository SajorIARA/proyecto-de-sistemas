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
    <section className="bg-[#FFFDF8] px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="contenedor-sitio">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#101710] px-6 py-16 text-center text-[#FFFDF8] sm:px-10 sm:py-20">
          <img
            src={IMAGENES_SITIO.cierre}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-[#0B110C]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(198,146,59,0.25),transparent_60%)]" />

          <div className="relative mx-auto max-w-2xl">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#E8C16A]">
              Tu próxima experiencia empieza aquí
            </p>

            <h2 className="font-display mt-5 text-[clamp(2.2rem,5vw,3.8rem)] font-black leading-[0.98] tracking-[-0.04em]">
              Guarda tus lugares y arma{" "}
              <span className="font-editorial font-normal italic text-[#E8C16A]">
                tu propia ruta
              </span>
              .
            </h2>

            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#F3EBDD]/70 sm:text-base">
              Crea una cuenta para organizar favoritos, ajustar tus
              preferencias de viaje y volver al catálogo sin perder lo que
              encontraste.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={isAuthenticated ? "/mi-cuenta" : "/registro"}
                className="group inline-flex items-center gap-3 rounded-full bg-[#E8C16A] px-6 py-3.5 text-sm font-black text-[#1B241D] transition hover:bg-[#F3D68F]"
              >
                {isAuthenticated ? "Ir a mi cuenta" : "Crear mi cuenta"}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B241D] text-[#E8C16A] transition-transform group-hover:translate-x-0.5">
                  <Icono nombre="flecha" className="h-4 w-4" />
                </span>
              </Link>

              <Link
                to="/destinos"
                className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-bold text-[#FFFDF8] backdrop-blur-md transition hover:bg-white/15"
              >
                <Icono nombre="brujula" className="h-4 w-4" />
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
