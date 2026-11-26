import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import { useAuth } from "../../auth/context/AuthContext";
import { useRutaOpcional } from "../../turismo/context/RutaContext";

function useNavegacionPrivada() {
  const { esAdmin } = useAuth();
  return esAdmin
    ? [
        { to: "/mi-cuenta/destinos", label: "Destinos" },
        { to: "/mi-cuenta/fuentes", label: "Fuentes / Importación" },
        { to: "/mi-cuenta/usuarios", label: "Usuarios" },
        { to: "/mi-cuenta", label: "Mi cuenta" },
      ]
    : [
        { to: "/mi-cuenta", label: "Resumen" },
        { to: "/ruta", label: "Mis viajes" },
        { to: "/mi-cuenta/recomendaciones", label: "Recomendaciones" },
        { to: "/mi-cuenta/preferencias", label: "Preferencias" },
      ];
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
  const { user, esAdmin, logout } = useAuth();
  const ruta = useRutaOpcional();
  const destinos = ruta?.destinos ?? [];
  const navigate = useNavigate();
  const enlaces = useNavegacionPrivada();
  const [cerrando, setCerrando] = useState(false);
  const nombre = user?.nombre?.trim() || user?.email || "Viajero";

  async function handleLogout() {
    setCerrando(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } finally {
      setCerrando(false);
    }
  }

  return (
    <div className={`chuki-private ${esAdmin ? "chuki-private--admin" : "chuki-private--traveler"}`}>
      <a
        href="#contenido-cuenta"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-[var(--color-surface)] focus:px-4 focus:py-3"
      >
        Saltar al contenido
      </a>
      <header className="chuki-private__header">
        <div className="contenedor-amplio chuki-private__header-inner">
          <Link to="/" className="chuki-brand">
            ✺ CHUKIYAPU
            <small>{esAdmin ? "CENTRO DE OPERACIONES" : "ATLAS VIVO DE LOS ANDES"}</small>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{nombre}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {esAdmin ? "Administrador" : `${destinos.length} paradas en borrador`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={cerrando}
              className="lp-button lp-button--secondary chuki-private__logout min-h-11 px-4 text-sm font-bold"
            >
              {cerrando ? "Cerrando…" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </header>

      <div className="contenedor-amplio chuki-private__layout">
        <aside className="chuki-private__sidebar">
          <div className="chuki-private__identity">
            <Icono nombre={esAdmin ? "escudo" : "ruta"} className="h-5 w-5" />
            <div>
              <strong>{esAdmin ? "Administración" : "Mi viaje"}</strong>
              <span>{esAdmin ? "Calidad del catálogo" : `${destinos.length} paradas en borrador`}</span>
            </div>
          </div>
          <nav
            aria-label={esAdmin ? "Navegación administrativa" : "Navegación de la cuenta"}
            className="chuki-private__nav"
          >
            {enlaces.map((enlace) => (
              <NavLink
                key={enlace.to}
                to={enlace.to}
                end={enlace.to === "/mi-cuenta"}
                className={({ isActive }) =>
                  `chuki-private__nav-link ${
                    isActive
                      ? "chuki-private__nav-link--active"
                      : ""
                  }`
                }
              >
                {enlace.label}
              </NavLink>
            ))}
            <Link
              to="/destinos"
              className="chuki-private__nav-link chuki-private__nav-link--back"
            >
              Volver a explorar
            </Link>
          </nav>
        </aside>

        <main id="contenido-cuenta" className="chuki-private__main">
          <header className="chuki-private__intro">
            <p>{eyebrow}</p>
            <h1>
              {titulo}
            </h1>
            <p>
              {descripcion}
            </p>
          </header>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
