/**
 * Layout compartido por el área privada (perfil, preferencias,
 * recomendaciones y paneles de administración).
 *
 * Sigue la misma gramática editorial del catálogo y de la portada: papel
 * crema, filetes finos, marca en bloque oscuro, navegación numerada en
 * monoespaciada y un encabezado de ficha para cada pantalla. La navegación
 * solo muestra los enlaces de administración a quien tiene rol ADMIN, de
 * modo que un turista nunca ve una opción que el backend le negaría.
 */

import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { RoleBadge } from "./RoleBadge";
import { Icono } from "../../../components/site/Iconos";

interface EnlacePrivado {
  to: string;
  label: string;
  end?: boolean;
}

/** Enlaces del área privada, resueltos según el rol. */
function useNavegacionPrivada(): EnlacePrivado[] {
  const { esAdmin } = useAuth();

  const enlaces: EnlacePrivado[] = [
    { to: "/mi-cuenta", label: "Mi perfil", end: true },
    { to: "/mi-cuenta/preferencias", label: "Preferencias" },
    { to: "/mi-cuenta/recomendaciones", label: "Recomendaciones" },
    { to: "/destinos", label: "Catálogo" },
  ];

  if (esAdmin) {
    enlaces.splice(
      1,
      0,
      { to: "/mi-cuenta/destinos", label: "Destinos" },
      { to: "/mi-cuenta/usuarios", label: "Usuarios" },
    );
  }

  return enlaces;
}

/** Dos cifras de índice que coronan cada ficha. */
function numero(valor: number): string {
  return String(valor).padStart(2, "0");
}

export function PrivateShell({
  eyebrow,
  titulo,
  descripcion,
  children,
}: {
  eyebrow: string;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  const { user, roles, esAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const enlaces = useNavegacionPrivada();

  const [cerrando, setCerrando] = useState(false);

  async function handleLogout() {
    setCerrando(true);

    try {
      await logout();
      navigate("/", { replace: true });
    } finally {
      setCerrando(false);
    }
  }

  const nombre = user?.nombre?.trim() || user?.email || "Viajero";
  const indice = numero(enlaces.length);

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EBDD] text-[#263029]">
      {/* =========================================================
          BARRA DE NAVEGACIÓN
      ========================================================== */}
      <header className="border-b border-[#5B3A29]/15 bg-[#FFFDF8]">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
          >
            <span className="flex h-10 w-10 items-center justify-center bg-[#233128] text-[#F3EBDD]">
              <Icono nombre="montana" className="h-5 w-5" />
            </span>

            <span className="text-[0.95rem] font-black leading-none tracking-tight text-[#233128]">
              Turismo{" "}
              <span className="font-editorial text-[1.1rem] font-normal italic text-[#9A5B3C]">
                La Paz
              </span>
            </span>
          </Link>

          <p className="hidden font-mono text-[9px] uppercase tracking-[0.22em] text-[#746D63] md:block">
            Bitácora de viaje <span className="text-[#C6923B]">/</span>{" "}
            {esAdmin ? "Administración" : "Turista"}
          </p>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="max-w-[16rem] truncate text-sm font-black leading-tight text-[#233128]">
                {nombre}
              </p>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#8A8177]">
                {esAdmin ? "Sesión de administración" : "Sesión de turista"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={cerrando}
              className="group inline-flex items-center gap-2 bg-[#233128] px-3.5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#FFFDF8] transition hover:bg-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              {cerrando ? "Cerrando…" : "Cerrar sesión"}
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
          </div>
        </div>

        <div className="border-t border-[#5B3A29]/10">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-8 lg:px-10">
            <nav
              aria-label="Navegación de la cuenta"
              className="flex items-center gap-6 overflow-x-auto"
            >
              {enlaces.map((enlace, posicion) => (
                <NavLink
                  key={enlace.to}
                  to={enlace.to}
                  end={enlace.end}
                  className={({ isActive }) =>
                    [
                      "group flex shrink-0 items-center gap-2 border-b-2 py-3.5 font-mono text-[9px] uppercase tracking-[0.18em] transition",
                      isActive
                        ? "border-[#9A5B3C] text-[#233128]"
                        : "border-transparent text-[#746D63] hover:border-[#C6923B]/40 hover:text-[#233128]",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={
                          isActive ? "text-[#9A5B3C]" : "text-[#C6923B]"
                        }
                      >
                        {numero(posicion + 1)}
                      </span>
                      {enlace.label}
                    </>
                  )}
                </NavLink>
              ))}

              <span className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
                {roles.map((rol) => (
                  <RoleBadge key={rol} rol={rol} />
                ))}
              </span>
            </nav>
          </div>
        </div>
      </header>

      {/* =========================================================
          FICHA / CONTENIDO
      ========================================================== */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[#5B3A29]/15 pb-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[#746D63]">
          <span>{eyebrow}</span>
          <span className="text-[#9A5B3C]">Cuaderno de campo</span>
          <span className="hidden sm:inline">La Paz · Bolivia</span>
        </div>

        <div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-[clamp(2.5rem,5vw,4.3rem)] font-black leading-[0.92] tracking-[-0.05em] text-[#233128]">
              {titulo}
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5C574E] sm:text-base">
              {descripcion}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="flex shrink-0 items-center gap-4 border border-[#2F4B3B]/25 px-4 py-3"
          >
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#746D63]">
                Fichas en la bitácora
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#233128]">
                {esAdmin ? "Mesa de administración" : "Recorrido personal"}
              </p>
            </div>

            <span className="font-display text-3xl font-black leading-none text-[#9A5B3C]">
              {indice}
            </span>
          </div>
        </div>

        <div className="mt-10">{children}</div>
      </main>

      {/* =========================================================
          PIE
      ========================================================== */}
      <footer className="border-t border-[#5B3A29]/15 bg-[#FFFDF8]/60">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-6 font-mono text-[8px] uppercase tracking-[0.22em] text-[#8A8177] sm:px-8 lg:px-10">
          <span>Turismo La Paz · Bolivia</span>
          <span className="text-[#9A5B3C]">Guía de campo · Edición 2026</span>
        </div>
      </footer>
    </div>
  );
}
