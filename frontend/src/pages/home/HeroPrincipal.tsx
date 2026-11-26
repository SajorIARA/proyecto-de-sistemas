/**
 * Portada turística principal: buscador, condiciones locales y collage vivo
 * de experiencias paceñas. Las imágenes son locales y el movimiento se
 * desactiva cuando el visitante prefiere reducirlo.
 */

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icono } from "../../components/site/Iconos";
import { IMAGENES_SITIO } from "../../config/imagenesSitio";
import { useClimaActual } from "../../features/clima/hooks/useClimaActual";

const EXPERIENCIAS = [
  {
    etiqueta: "Miradores de La Paz",
    ...IMAGENES_SITIO.categorias.Miradores,
    clase: "right-[25%] top-12 h-64 w-48 rounded-t-[6rem] rounded-bl-2xl rounded-br-2xl sm:h-80 sm:w-60",
  },
  {
    etiqueta: "Centro histórico",
    ...IMAGENES_SITIO.categorias.Cultura,
    clase: "right-0 top-36 h-40 w-32 rounded-tl-2xl rounded-tr-[3rem] rounded-bl-2xl rounded-br-[3rem] sm:h-52 sm:w-40",
  },
  {
    etiqueta: "Sabores paceños",
    ...IMAGENES_SITIO.categorias.Gastronomía,
    clase: "bottom-0 right-[18%] h-28 w-36 rounded-tl-[3rem] rounded-tr-2xl rounded-bl-[3rem] rounded-br-2xl sm:h-36 sm:w-48",
  },
] as const;

export function HeroPrincipal() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const clima = useClimaActual();

  const resumenClima = clima.isLoading
    ? "Actualizando clima…"
    : clima.data
      ? `${clima.data.temperaturaC} °C · ${clima.data.condicion}`
      : "Clima no disponible";
  const detalleClima = clima.data
    ? "Condiciones actuales en La Paz"
    : "No pudimos consultar el tiempo actual";

  function enviarBusqueda(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const consulta = busqueda.trim();
    navigate(consulta ? `/destinos?q=${encodeURIComponent(consulta)}` : "/destinos");
  }

  return (
    <section
      id="inicio"
      aria-label="Presentación de Turismo La Paz"
      className="relative isolate overflow-hidden bg-[var(--color-surface-muted)] text-[var(--color-text)]"
    >
      <div className="absolute inset-y-0 left-[42%] right-0 -z-10 overflow-hidden">
        <img
          src={IMAGENES_SITIO.hero.aventura.src}
          alt=""
          className="h-full w-full object-cover object-center portada-zoom"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,#E7F0E3_0%,#F8EFDC_45%,rgba(248,239,220,0.08)_78%)]" />
      <div className="absolute -left-40 -top-56 -z-10 h-[32rem] w-[32rem] rounded-full bg-[var(--color-action)] blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-[70%_30%_68%_32%] border-2 border-[var(--color-border-strong)]" />

      <div className="contenedor-sitio grid min-h-[720px] grid-cols-1 items-center gap-8 pb-20 pt-32 sm:min-h-[790px] sm:pb-28 sm:pt-44 lg:grid-cols-[minmax(0,57%)_minmax(330px,43%)] lg:pt-40">
        <div className="relative z-20 max-w-2xl">
          <p className="inline-flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-danger)] shadow-[0_0_0_6px_rgba(223,94,56,0.16)]" />
            Una ciudad que sube contigo
          </p>

          <h1 className="font-editorial mt-5 text-[clamp(3.7rem,7.2vw,6.5rem)] font-bold leading-[0.9] tracking-[-0.055em]">
            Busca tu <em className="font-normal italic text-[var(--color-danger)]">propia</em>{" "}
            forma de vivir La Paz.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-brand)] sm:text-lg">
            Teleféricos, sabores de mercado, calles con historia y paisajes de
            altura. Elige por dónde empieza tu aventura.
          </p>

          <form
            onSubmit={enviarBusqueda}
            className="relative z-30 mt-8 flex max-w-xl flex-col gap-2 rounded-[1.3rem] bg-[var(--color-surface)] p-2 pl-4 shadow-[0_18px_40px_rgba(24,56,45,0.18)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(24,56,45,0.25)] sm:flex-row sm:items-center"
          >
            <Icono nombre="buscar" className="hidden h-5 w-5 shrink-0 text-[var(--color-danger)] sm:block" />
            <label htmlFor="busqueda-hero" className="sr-only">
              ¿Qué quieres descubrir hoy?
            </label>
            <input
              id="busqueda-hero"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="¿Qué quieres descubrir hoy?"
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm font-semibold outline-none placeholder:text-[var(--color-brand)]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--color-danger)] px-5 py-3 text-sm font-black text-[var(--lp-night)] transition hover:-rotate-1 hover:bg-[var(--color-danger)]"
            >
              Explorar guía ↗
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-xs text-[var(--color-brand)]">
            <p><strong className="font-editorial block text-xl text-[var(--color-brand)]">3.640 msnm</strong>Ciudad de altura</p>
            <p><strong className="font-editorial block text-xl text-[var(--color-brand)]">+80 destinos</strong>Por explorar</p>
            <p><strong className="font-editorial block text-xl text-[var(--color-brand)]">4 zonas</strong>Con historia</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/destinos?vista=armar" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-route-strong)] px-5 py-3 text-sm font-black text-[var(--color-text)] transition hover:bg-[var(--color-surface)]">
              Armar mi ruta <Icono nombre="flecha" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative h-[430px] sm:h-[500px]">
          <div
            aria-live="polite"
            className="absolute right-0 top-0 z-20 flex items-center gap-3 rounded-2xl bg-[var(--color-route-strong)] px-4 py-3 text-xs text-[var(--color-text)] shadow-xl"
          >
            <Icono nombre="clima" className="h-6 w-6 text-[var(--color-action)]" />
            <span>
              <strong className="block text-[var(--color-text)]">{resumenClima}</strong>
              {detalleClima}
            </span>
          </div>

          {EXPERIENCIAS.map((experiencia, indice) => (
            <article
              key={experiencia.etiqueta}
              className={`absolute z-10 overflow-hidden border-[7px] border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_40px_rgba(24,56,45,0.24)] transition duration-500 hover:z-20 hover:-translate-y-3 hover:rotate-1 ${experiencia.clase} ${indice === 1 ? "animate-[portada-flotar_6s_ease-in-out_1s_infinite]" : "animate-[portada-flotar_7s_ease-in-out_infinite]"}`}
            >
              <img src={experiencia.src} alt={experiencia.alt} className="h-full w-full object-cover transition duration-700 hover:scale-110" />
              <span className="absolute bottom-2 left-2 rounded-lg bg-[var(--color-surface-muted)] px-2 py-1 text-[0.7rem] font-black text-[var(--color-brand)]">
                {experiencia.etiqueta}
              </span>
            </article>
          ))}

          <svg className="absolute right-0 top-[54%] z-30 h-36 w-[20rem] overflow-visible" viewBox="0 0 320 144" aria-hidden="true">
            <path d="M304 108 C238 18 146 12 84 65 S24 110 10 42" fill="none" stroke="#DF5E38" strokeDasharray="4 8" strokeLinecap="round" strokeWidth="3" />
            <text fontSize="29">
              <animateMotion dur="8s" path="M304 108 C238 18 146 12 84 65 S24 110 10 42" repeatCount="indefinite" />
              🚡
            </text>
          </svg>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-20 translate-y-1/2 rounded-[50%] bg-[var(--color-surface-muted)]" />
    </section>
  );
}
