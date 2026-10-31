/**
 * Hero de la portada.
 *
 * Cuatro fotografías se alternan en crossfade (nunca video) con un
 * avance automático que se pausa al interactuar y se desactiva si el
 * usuario prefiere menos movimiento. El titular se mantiene estable
 * para conservar el mensaje de marca; lo que cambia es la imagen y la
 * etiqueta de la experiencia activa.
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
    imagen: IMAGENES_SITIO.hero.aventura,
    alt: "Cumbres nevadas de la cordillera andina",
  },
  {
    id: "cultura",
    etiqueta: "Cultura",
    imagen: IMAGENES_SITIO.hero.cultura,
    alt: "Calles y tejados de la ciudad de La Paz",
  },
  {
    id: "naturaleza",
    etiqueta: "Naturaleza",
    imagen: IMAGENES_SITIO.hero.naturaleza,
    alt: "Lago y montañas del altiplano boliviano",
  },
  {
    id: "gastronomia",
    etiqueta: "Gastronomía",
    imagen: IMAGENES_SITIO.hero.gastronomia,
    alt: "Mesa con platos de la cocina local",
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
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#121A14] text-[#FFFDF8]"
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
              src={item.imagen}
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

        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(9,14,10,0.94)_0%,rgba(9,14,10,0.76)_38%,rgba(9,14,10,0.3)_72%,rgba(9,14,10,0.62)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0B110C] via-[#0B110C]/50 to-transparent" />
      </div>

      <div className="contenedor-sitio flex flex-1 flex-col justify-end pb-10 pt-32 sm:pt-36 lg:pb-14">
        <div className="max-w-4xl">
          <p className="portada-aparece inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#F1D79D] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E8C16A]" />
            La Paz · Bolivia
          </p>

          <h1 className="portada-aparece font-display mt-6 text-[clamp(2.9rem,7.2vw,6.6rem)] font-black leading-[0.92] tracking-[-0.045em] [animation-delay:80ms]">
            Explora{" "}
            <em className="font-editorial font-normal italic text-[#E8C16A]">
              La Paz
            </em>{" "}
            como nunca antes.
          </h1>

          <p className="portada-aparece mt-6 max-w-xl text-base leading-7 text-[#F3EBDD]/75 [animation-delay:160ms] sm:text-lg">
            Cultura, miradores, gastronomía y paisajes de altura en una ciudad
            donde los Andes, la historia y la vida cotidiana se encuentran.
          </p>

          <div className="portada-aparece mt-9 flex flex-wrap items-center gap-3 [animation-delay:240ms]">
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
              className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-bold text-[#FFFDF8] backdrop-blur-md transition hover:bg-white/15"
            >
              <Icono nombre="brujula" className="h-4 w-4" />
              Explorar catálogo
            </Link>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-[#0B110C]/45 backdrop-blur-md">
        <div className="contenedor-sitio flex flex-col gap-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#FFFDF8]/55">
            <span className="text-[#E8C16A]">
              {String(activa + 1).padStart(2, "0")}
            </span>{" "}
            / {String(DIAPOSITIVAS.length).padStart(2, "0")} ·{" "}
            {diapositiva.etiqueta}
          </p>

          <ul
            className="sin-scrollbar flex gap-2 overflow-x-auto"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onFocus={() => setPausado(true)}
            onBlur={() => setPausado(false)}
          >
            {DIAPOSITIVAS.map((item, indice) => {
              const seleccionada = indice === activa;

              return (
                <li key={item.id} className="min-w-[8.5rem] flex-1">
                  <button
                    type="button"
                    onClick={() => setActiva(indice)}
                    aria-pressed={seleccionada}
                    className="group w-full text-left"
                  >
                    <span
                      className={[
                        "block text-xs font-bold transition",
                        seleccionada
                          ? "text-[#FFFDF8]"
                          : "text-[#FFFDF8]/50 group-hover:text-[#FFFDF8]/80",
                      ].join(" ")}
                    >
                      {item.etiqueta}
                    </span>
                    <span className="mt-2 block h-[2px] w-full overflow-hidden rounded-full bg-white/15">
                      <span
                        className={[
                          "block h-full rounded-full transition-all duration-500",
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
