/**
 * Pie de página del sitio público.
 *
 * Cierra la portada con la misma paleta andina del hero, un mapa de
 * enlaces a las secciones y un acceso directo al catálogo filtrado por
 * categoría. El nombre de marca se renderiza como texto (no como
 * enlace) para no competir con el logo de la cabecera.
 */

import { Link } from "react-router-dom";
import { CATEGORIAS_OFICIALES } from "../../config/turismo";
import { Icono } from "./Iconos";

const ENLACES_EXPLORAR = [
  { etiqueta: "Catálogo completo", destino: "/destinos", ancla: false },
  { etiqueta: "Descubre La Paz", destino: "#descubre", ancla: true },
  { etiqueta: "La Paz por zonas", destino: "#zonas", ancla: true },
  { etiqueta: "Rutas gastronómicas", destino: "#gastronomia", ancla: true },
  { etiqueta: "Datos útiles", destino: "#datos", ancla: true },
] as const;

const ENLACES_CUENTA = [
  { etiqueta: "Mi cuenta", destino: "/mi-cuenta" },
  { etiqueta: "Crear cuenta", destino: "/registro" },
  { etiqueta: "Preferencias de viaje", destino: "/mi-cuenta/preferencias" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#1B241D] text-[#F3EBDD]">
      <div
        className="trama-topografica pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />

      <div className="contenedor-sitio relative py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E9DFC9]/20 bg-[#F3EBDD]/10 text-[#F3EBDD]">
                <Icono nombre="montana" className="h-5 w-5" />
              </span>
              <span className="text-lg font-black leading-none tracking-tight text-[#FFFDF8]">
                Turismo{" "}
                <span className="font-editorial text-xl font-normal italic text-[#E8C16A]">
                  La Paz
                </span>
              </span>
            </p>

            <p className="mt-5 text-sm leading-7 text-[#F3EBDD]/60">
              Una guía para recorrer la ciudad desde sus miradores, su
              historia, sus mercados y sus paisajes de altura.
            </p>

            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#E9DFC9]/15 px-3.5 py-1.5 text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#E8C16A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E8C16A]" />
              Bolivia · 3.600 m
            </p>
          </div>

          <nav aria-label="Explorar">
            <h2 className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#E8C16A]">
              Explorar
            </h2>
            <ul className="mt-5 space-y-3">
              {ENLACES_EXPLORAR.map((enlace) => (
                <li key={enlace.etiqueta}>
                  {enlace.ancla ? (
                    <a
                      href={enlace.destino}
                      className="text-sm font-medium text-[#F3EBDD]/70 transition hover:text-[#FFFDF8]"
                    >
                      {enlace.etiqueta}
                    </a>
                  ) : (
                    <Link
                      to={enlace.destino}
                      className="text-sm font-medium text-[#F3EBDD]/70 transition hover:text-[#FFFDF8]"
                    >
                      {enlace.etiqueta}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Categorías">
            <h2 className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#E8C16A]">
              Categorías
            </h2>
            <ul className="mt-5 space-y-3">
              {CATEGORIAS_OFICIALES.map((categoria) => (
                <li key={categoria}>
                  <Link
                    to={`/destinos?categoria=${encodeURIComponent(categoria)}`}
                    className="text-sm font-medium text-[#F3EBDD]/70 transition hover:text-[#FFFDF8]"
                  >
                    {categoria}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Cuenta">
            <h2 className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#E8C16A]">
              Cuenta
            </h2>
            <ul className="mt-5 space-y-3">
              {ENLACES_CUENTA.map((enlace) => (
                <li key={enlace.etiqueta}>
                  <Link
                    to={enlace.destino}
                    className="text-sm font-medium text-[#F3EBDD]/70 transition hover:text-[#FFFDF8]"
                  >
                    {enlace.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[#E9DFC9]/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#F3EBDD]/60">
            © 2026 Turismo La Paz · Proyecto de Sistemas
          </p>

          <a
            href="#inicio"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#F3EBDD]/70 transition hover:text-[#FFFDF8]"
          >
            Volver al inicio
            <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
