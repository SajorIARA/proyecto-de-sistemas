/**
 * Cabecera del sitio público.
 *
 * Flota sobre el hero con fondo transparente y, al hacer scroll, pasa a
 * una barra sólida para que la navegación siga legible. Incluye menú
 * móvil y el estado de sesión, sin duplicar los enlaces de acceso que
 * ya viven en el hero.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { Icono } from "./Iconos";

const ENLACES = [
  { etiqueta: "Descubre", destino: "#descubre" },
  { etiqueta: "Zonas", destino: "#zonas" },
  { etiqueta: "Gastronomía", destino: "#gastronomia" },
  { etiqueta: "Datos útiles", destino: "#datos" },
] as const;

export function SiteHeader() {
  const { isAuthenticated } = useAuth();
  const [conFondo, setConFondo] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const alDesplazar = () => setConFondo(window.scrollY > 24);

    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });

    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  const solido = conFondo || menuAbierto;

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-500",
        solido
          ? "border-b border-[#5B3A29]/10 bg-[#FFFDF8]/95 shadow-[0_10px_40px_rgba(38,48,41,0.08)] backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-[#0F150F]/75 via-[#0F150F]/30 to-transparent",
      ].join(" ")}
    >
      <div className="contenedor-sitio flex h-[74px] items-center justify-between gap-4 lg:h-[86px]">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-3"
          onClick={() => setMenuAbierto(false)}
        >
          <span
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-500",
              solido
                ? "border-[#2F4B3B]/20 bg-[#2F4B3B] text-[#F3EBDD]"
                : "border-white/25 bg-white/10 text-[#FFFDF8] backdrop-blur-md",
            ].join(" ")}
          >
            <Icono nombre="montana" className="h-5 w-5" />
          </span>

          <span
            className={[
              "text-[0.95rem] font-black leading-none tracking-tight transition-colors duration-500",
              solido ? "text-[#233128]" : "text-[#FFFDF8]",
            ].join(" ")}
          >
            Turismo{" "}
            <span
              className={[
                "font-editorial text-[1.1rem] font-normal italic",
                solido ? "text-[#9A5B3C]" : "text-[#E8C16A]",
              ].join(" ")}
            >
              La Paz
            </span>
          </span>
        </Link>

        <nav
          aria-label="Secciones de la portada"
          className="hidden items-center gap-1 lg:flex"
        >
          {ENLACES.map((enlace) => (
            <a
              key={enlace.destino}
              href={enlace.destino}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                solido
                  ? "text-[#4C554D] hover:bg-[#2F4B3B]/10 hover:text-[#233128]"
                  : "text-[#FFFDF8]/80 hover:bg-white/10 hover:text-[#FFFDF8]",
              ].join(" ")}
            >
              {enlace.etiqueta}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/destinos"
            className={[
              "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition",
              solido
                ? "border-[#2F4B3B]/20 text-[#2F4B3B] hover:border-[#2F4B3B] hover:bg-[#2F4B3B] hover:text-[#FFFDF8]"
                : "border-white/30 text-[#FFFDF8] hover:bg-white/10",
            ].join(" ")}
          >
            <Icono nombre="buscar" className="h-4 w-4" />
            Catálogo
          </Link>

          {isAuthenticated ? (
            <Link
              to="/mi-cuenta"
              className={[
                "rounded-full px-5 py-2.5 text-sm font-black transition",
                solido
                  ? "bg-[#2F4B3B] text-[#FFFDF8] hover:bg-[#233128]"
                  : "bg-[#FFFDF8] text-[#233128] hover:bg-[#F3EBDD]",
              ].join(" ")}
            >
              Mi cuenta
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={[
                  "px-2 text-sm font-semibold transition",
                  solido
                    ? "text-[#4C554D] hover:text-[#233128]"
                    : "text-[#FFFDF8]/80 hover:text-[#FFFDF8]",
                ].join(" ")}
              >
                Iniciar sesión
              </Link>

              <Link
                to="/registro"
                className={[
                  "rounded-full px-5 py-2.5 text-sm font-black transition",
                  solido
                    ? "bg-[#9A5B3C] text-[#FFFDF8] hover:bg-[#7C452C]"
                    : "bg-[#E8C16A] text-[#233128] hover:bg-[#F3D68F]",
                ].join(" ")}
              >
                Registrarme
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-expanded={menuAbierto}
          aria-controls="menu-portada"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          className={[
            "flex h-11 w-11 items-center justify-center rounded-full border transition lg:hidden",
            solido
              ? "border-[#2F4B3B]/20 text-[#233128]"
              : "border-white/30 text-[#FFFDF8]",
          ].join(" ")}
        >
          <Icono nombre={menuAbierto ? "cerrar" : "menu"} className="h-5 w-5" />
        </button>
      </div>

      {menuAbierto && (
        <div
          id="menu-portada"
          className="border-t border-[#5B3A29]/10 bg-[#FFFDF8] lg:hidden"
        >
          <nav
            aria-label="Secciones de la portada (móvil)"
            className="contenedor-sitio flex flex-col py-5"
          >
            {ENLACES.map((enlace) => (
              <a
                key={enlace.destino}
                href={enlace.destino}
                onClick={() => setMenuAbierto(false)}
                className="flex items-center justify-between border-b border-[#5B3A29]/10 py-3.5 text-base font-bold text-[#233128]"
              >
                {enlace.etiqueta}
                <Icono
                  nombre="flecha"
                  className="h-4 w-4 text-[#9A5B3C]"
                />
              </a>
            ))}

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Link
                to="/destinos"
                onClick={() => setMenuAbierto(false)}
                className="rounded-full bg-[#2F4B3B] px-4 py-3 text-center text-sm font-black text-[#FFFDF8]"
              >
                Catálogo
              </Link>

              {isAuthenticated ? (
                <Link
                  to="/mi-cuenta"
                  onClick={() => setMenuAbierto(false)}
                  className="rounded-full bg-[#9A5B3C] px-4 py-3 text-center text-sm font-black text-[#FFFDF8]"
                >
                  Mi cuenta
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuAbierto(false)}
                    className="rounded-full border border-[#2F4B3B]/25 px-4 py-3 text-center text-sm font-black text-[#2F4B3B]"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/registro"
                    onClick={() => setMenuAbierto(false)}
                    className="col-span-2 rounded-full bg-[#9A5B3C] px-4 py-3 text-center text-sm font-black text-[#FFFDF8]"
                  >
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
