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
          ? "border-b border-[#5B3A29]/15 bg-[#FFFDF8]/95 shadow-[0_10px_40px_rgba(35,49,40,0.08)] backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-[#101710]/80 via-[#101710]/30 to-transparent",
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
              "flex h-10 w-10 items-center justify-center border transition-colors duration-500",
              solido
                ? "border-[#233128] bg-[#233128] text-[#F3EBDD]"
                : "border-[#F3EBDD]/30 bg-[#101710]/25 text-[#FFFDF8] backdrop-blur-md",
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
          className="hidden items-center gap-2 lg:flex"
        >
          {ENLACES.map((enlace) => (
            <a
              key={enlace.destino}
              href={enlace.destino}
              className={[
                "border-b px-2.5 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] transition",
                solido
                  ? "border-transparent text-[#514B43] hover:border-[#9A5B3C] hover:text-[#8D4F32]"
                  : "border-transparent text-[#F3EBDD]/75 hover:border-[#E8C16A] hover:text-[#FFFDF8]",
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
              "inline-flex items-center gap-2 border px-4 py-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] transition",
              solido
                ? "border-[#233128]/30 text-[#233128] hover:border-[#233128] hover:bg-[#233128] hover:text-[#FFFDF8]"
                : "border-[#F3EBDD]/35 text-[#FFFDF8] hover:border-[#E8C16A] hover:text-[#E8C16A]",
            ].join(" ")}
          >
            <Icono nombre="buscar" className="h-4 w-4" />
            Catálogo
          </Link>

          {isAuthenticated ? (
            <Link
              to="/mi-cuenta"
              className={[
                "px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition",
                solido
                  ? "bg-[#233128] text-[#FFFDF8] hover:bg-[#2F4B3B]"
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
                  "border-b px-1 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] transition",
                  solido
                    ? "border-[#233128]/30 text-[#514B43] hover:border-[#9A5B3C] hover:text-[#8D4F32]"
                    : "border-[#F3EBDD]/30 text-[#F3EBDD]/80 hover:border-[#E8C16A] hover:text-[#FFFDF8]",
                ].join(" ")}
              >
                Iniciar sesión
              </Link>

              <Link
                to="/registro"
                className={[
                  "px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition",
                  solido
                    ? "bg-[#9A5B3C] text-[#FFFDF8] hover:bg-[#8D4F32]"
                    : "bg-[#E8C16A] text-[#233128] hover:bg-[#F3D992]",
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
            "flex h-10 w-10 items-center justify-center border transition lg:hidden",
            solido
              ? "border-[#233128]/25 text-[#233128]"
              : "border-[#F3EBDD]/30 text-[#FFFDF8]",
          ].join(" ")}
        >
          <Icono nombre={menuAbierto ? "cerrar" : "menu"} className="h-5 w-5" />
        </button>
      </div>

      {menuAbierto && (
        <div
          id="menu-portada"
          className="border-t border-[#5B3A29]/15 bg-[#FFFDF8] lg:hidden"
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
                className="flex items-center justify-between border-b border-[#5B3A29]/15 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#233128]"
              >
                {enlace.etiqueta}
                <Icono
                  nombre="flecha"
                  className="h-4 w-4 text-[#9A5B3C]"
                />
              </a>
            ))}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                to="/destinos"
                onClick={() => setMenuAbierto(false)}
                className="bg-[#233128] px-4 py-3 text-center font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8]"
              >
                Catálogo
              </Link>

              {isAuthenticated ? (
                <Link
                  to="/mi-cuenta"
                  onClick={() => setMenuAbierto(false)}
                  className="bg-[#9A5B3C] px-4 py-3 text-center font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8]"
                >
                  Mi cuenta
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuAbierto(false)}
                    className="border border-[#233128]/25 px-4 py-3 text-center font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#233128]"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/registro"
                    onClick={() => setMenuAbierto(false)}
                    className="col-span-2 bg-[#9A5B3C] px-4 py-3 text-center font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8]"
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
