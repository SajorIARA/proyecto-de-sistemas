/**
 * Layout compartido por las secciones privadas: encabezado andino sobre
 * cuerpo crema, idéntico en paleta al catálogo (`/destinos`) y al login
 * (`AuthShell`). Antes estas pantallas usaban `slate-950`/`amber-300`, que
 * rompían la identidad del proyecto.
 *
 * La navegación incluye el enlace al panel de usuarios solo si el usuario
 * tiene rol ADMIN, de modo que un turista nunca ve una opción que el backend
 * le negaría con 403.
 */

import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { RoleBadge } from "./RoleBadge";

/** Enlaces del área privada, resueltos según el rol. */
function useNavegacionPrivada() {
  const { esAdmin } = useAuth();

  const enlaces = [
    { to: "/mi-cuenta", label: "Mi perfil" },
    { to: "/destinos", label: "Catálogo" },
  ];

  if (esAdmin) {
    // Se inserta entre el perfil y el catálogo: es la sección de trabajo.
    enlaces.splice(1, 0, { to: "/mi-cuenta/usuarios", label: "Usuarios" });
  }

  return enlaces;
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EBDD] text-[#263029]">
      {/* =========================================================
          ENCABEZADO
      ========================================================== */}
      <header className="relative overflow-hidden border-b border-[#5B3A29]/[0.08] bg-[#233128]">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(233,223,201,.35) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(233,223,201,.35) 25%, transparent 25%)
            `,
            backgroundSize: "52px 52px",
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#C6923B]/25 blur-[120px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Marca */}
            <Link to="/" className="group flex w-fit items-center gap-3 text-[#F3EBDD]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9DFC9]/25 bg-[#F5EFE4]/10 text-lg backdrop-blur-xl transition group-hover:bg-[#F5EFE4]/20">
                ⛰
              </span>

              <span className="text-base font-black tracking-tight">
                Turismo{" "}
                <span className="font-medium text-[#E7B75F]">La Paz</span>
              </span>
            </Link>

            {/* Usuario en sesión */}
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-black text-[#FFFDF8]">{nombre}</p>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#F5EFE4]/55">
                  {esAdmin ? "Sesión de administración" : "Sesión de turista"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={cerrando}
                className="rounded-full bg-[#F3EBDD] px-5 py-2.5 text-sm font-black text-[#233128] transition hover:bg-[#FFFDF8] disabled:opacity-60"
              >
                {cerrando ? "Cerrando…" : "Cerrar sesión"}
              </button>
            </div>
          </div>

          {/* Navegación del área privada */}
          <nav
            aria-label="Navegación de la cuenta"
            className="mt-7 flex flex-wrap items-center gap-2"
          >
            {enlaces.map((enlace) => (
              <Link
                key={enlace.to}
                to={enlace.to}
                className="rounded-full border border-[#E9DFC9]/18 bg-[#1A241C]/40 px-4 py-2 text-xs font-black text-[#F3EBDD]/80 backdrop-blur-xl transition hover:border-[#E7B75F]/50 hover:text-[#FFFDF8]"
              >
                {enlace.label}
              </Link>
            ))}

            {roles.map((rol) => (
              <RoleBadge
                key={rol}
                rol={rol}
                className="border-[#E9DFC9]/20 bg-[#F5EFE4]/10 text-[#F1D79D]"
              />
            ))}
          </nav>
        </div>
      </header>

      {/* =========================================================
          CONTENIDO
      ========================================================== */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-[#9A5B3C]/25 bg-[#9A5B3C]/10 px-4 py-2 text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#8D4F32]">
            <span className="h-2 w-2 rounded-full bg-[#9A5B3C]" />
            {eyebrow}
          </p>

          <h1 className="mt-5 text-[clamp(2rem,4.5vw,3rem)] font-black leading-[0.98] tracking-[-0.04em] text-[#233128]">
            {titulo}
          </h1>

          <p className="mt-4 text-sm leading-7 text-[#514B43] sm:text-base">
            {descripcion}
          </p>
        </div>

        {children}
      </main>

      {/* =========================================================
          PIE
      ========================================================== */}
      <footer className="border-t border-[#5B3A29]/[0.08] px-6 py-8 text-center sm:px-8">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-[#8A8177]">
          Turismo La Paz · Bolivia
        </p>
      </footer>
    </div>
  );
}
