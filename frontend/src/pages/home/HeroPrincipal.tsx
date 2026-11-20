/**
 * Hero de la portada.
 *
 * Cuatro fotografías se alternan en crossfade (nunca video) con un
 * avance automático que se pausa al interactuar y se desactiva si el
 * usuario prefiere menos movimiento. La composición imita la cabecera
 * de una guía impresa: línea de datos, titular a sangre y un índice
 * numerado para recorrer las escenas.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { useAuth } from "../../features/auth/context/AuthContext";
import { Icono } from "../../components/site/Iconos";

const DIAPOSITIVAS = [
  {
    id: "aventura",
    etiqueta: "Aventura",
    ...IMAGENES_SITIO.hero.aventura,
  },
  {
    id: "cultura",
    etiqueta: "Cultura",
    ...IMAGENES_SITIO.hero.cultura,
  },
  {
    id: "naturaleza",
    etiqueta: "Naturaleza",
    ...IMAGENES_SITIO.hero.naturaleza,
  },
  {
    id: "gastronomia",
    etiqueta: "Gastronomía",
    ...IMAGENES_SITIO.hero.gastronomia,
  },
] as const;

const INTERVALO_MS = 6500;

export function HeroPrincipal() {
  const { isAuthenticated } = useAuth();
  const [activa, setActiva] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) {
      return;
    }

    // `matchMedia` no existe en todos los entornos de prueba.
    const prefiereMenosMovimiento =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefiereMenosMovimiento) {
      return;
    }

    const temporizador = window.setInterval(() => {
      setActiva((indice) => (indice + 1) % DIAPOSITIVAS.length);
    }, INTERVALO_MS);

    return () => window.clearInterval(temporizador);
  }, [pausado]);

  const diapositiva = DIAPOSITIVAS[activa];

  return (
    <section
      id="inicio"
      aria-label="Presentación de Turismo La Paz"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#0F150F] text-[#FFFDF8]"
    >
      <div className="absolute inset-0 -z-10">
        {DIAPOSITIVAS.map((item, indice) => (
          <div
            key={item.id}
            aria-hidden={indice !== activa}
            className={[
              "absolute inset-0 transition-opacity duration-[1400ms] ease-out",
              indice === activa ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <img
              src={item.src}
              alt={indice === activa ? item.alt : ""}
              loading="eager"
              fetchPriority={indice === 0 ? "high" : "low"}
              decoding="async"
              className={[
                "h-full w-full object-cover",
                indice === activa ? "portada-zoom" : "",
              ].join(" ")}
            />
          </div>
        ))}

        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(10,15,11,0.92)_0%,rgba(10,15,11,0.68)_42%,rgba(10,15,11,0.14)_78%,rgba(10,15,11,0.55)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0B110C] via-[#0B110C]/55 to-transparent" />
      </div>

      <p className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 [writing-mode:vertical-rl] font-mono text-[9px] uppercase tracking-[0.42em] text-[#FFFDF8]/35 lg:block">
        Altiplano boliviano · 3.640 m
      </p>

      <div className="contenedor-sitio relative flex flex-1 flex-col">
        <div className="mt-[86px] flex items-center justify-between gap-6 border-b border-white/15 pb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#FFFDF8]/55 sm:text-[10px] sm:tracking-[0.26em] lg:mt-[104px]">
          <span>
            <span className="hidden sm:inline">Guía de ciudad · </span>
            La Paz, Bolivia
          </span>
          <span className="hidden md:inline">16°30′ S · 68°09′ O</span>
          <span className="hidden text-[#E8C16A] sm:inline">
            3.640 m s. n. m.
          </span>
          <span className="text-[#E8C16A] sm:hidden">3.640 m</span>
        </div>

        <div className="flex flex-1 flex-col justify-end pb-14 pt-20 sm:pb-16">
          <div className="max-w-5xl">
            <p className="portada-aparece font-mono text-[10px] uppercase tracking-[0.32em] text-[#E8C16A]">
              Bienvenido a la hoyada
            </p>

            <h1 className="portada-aparece font-display mt-5 text-[clamp(3rem,8vw,7rem)] font-black leading-[0.88] tracking-[-0.05em] [animation-delay:80ms]">
              La Paz no se visita,{" "}
              <span className="block">
                <em className="font-editorial font-normal italic text-[#E8C16A]">
                  se sube.
                </em>
              </span>
            </h1>

            <div className="portada-aparece mt-9 grid gap-8 border-t border-white/15 pt-7 [animation-delay:160ms] lg:grid-cols-[minmax(0,30rem)_auto] lg:items-end lg:justify-between">
              <p className="text-base leading-7 text-[#F3EBDD]/75 sm:text-lg">
                Museos coloniales, mercados de altura y miradores sobre la
                ciudad. Elige por zona, categoría o precio y arma tu ruta.
              </p>

              <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link
                  to={isAuthenticated ? "/mi-cuenta" : "/registro"}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#E8C16A] px-6 py-3.5 text-sm font-black text-[#1B241D] transition hover:bg-[#F3D68F]"
                >
                  Comenzar ahora
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B241D] text-[#E8C16A] transition-transform group-hover:translate-x-0.5">
                    <Icono nombre="flecha" className="h-4 w-4" />
                  </span>
                </Link>

                <Link
                  to="/destinos"
                  className="group inline-flex items-center gap-2 border-b border-white/35 pb-1 text-sm font-bold text-[#FFFDF8] transition hover:border-[#E8C16A] hover:text-[#E8C16A]"
                >
                  Ver el catálogo
                  <Icono
                    nombre="flecha"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/15 bg-[#0B110C]/55 backdrop-blur-md">
        <div className="contenedor-sitio grid gap-4 py-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#FFFDF8]/50">
            <span className="text-[#E8C16A]">
              {String(activa + 1).padStart(2, "0")}
            </span>{" "}
            / {String(DIAPOSITIVAS.length).padStart(2, "0")} ·{" "}
            {diapositiva.etiqueta}
          </p>

          <ul
            className="sin-scrollbar grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:items-center sm:justify-end sm:gap-5"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onFocus={() => setPausado(true)}
            onBlur={() => setPausado(false)}
          >
            {DIAPOSITIVAS.map((item, indice) => {
              const seleccionada = indice === activa;

              return (
                <li key={item.id} className="min-w-0 sm:min-w-[7.5rem]">
                  <button
                    type="button"
                    onClick={() => setActiva(indice)}
                    aria-pressed={seleccionada}
                    className="group w-full text-left"
                  >
                    <span
                      className={[
                        "block font-mono text-[9px] tracking-[0.2em] transition",
                        seleccionada
                          ? "text-[#E8C16A]"
                          : "text-[#FFFDF8]/35 group-hover:text-[#FFFDF8]/60",
                      ].join(" ")}
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={[
                        "mt-1 block text-xs font-bold transition",
                        seleccionada
                          ? "text-[#FFFDF8]"
                          : "text-[#FFFDF8]/50 group-hover:text-[#FFFDF8]/80",
                      ].join(" ")}
                    >
                      {item.etiqueta}
                    </span>
                    <span className="mt-2 block h-px w-full overflow-hidden bg-white/15">
                      <span
                        className={[
                          "block h-full transition-all duration-500",
                          seleccionada
                            ? "w-full bg-[#E8C16A]"
                            : "w-0 bg-white/40 group-hover:w-1/3",
                        ].join(" ")}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
