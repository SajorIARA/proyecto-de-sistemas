import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ButtonLink } from "../../design-system/components/Button";
import { useAuth } from "../../features/auth/context/AuthContext";
import { useRutaOpcional } from "../../features/turismo/context/RutaContext";
import { Icono } from "./Iconos";

const ENLACES = [
  { etiqueta: "Inicio", destino: "/" },
  { etiqueta: "Destinos", destino: "/destinos" },
  { etiqueta: "Experiencias", destino: "/#experiencias" },
  { etiqueta: "Crear mi ruta", destino: "/destinos?vista=armar" },
] as const;

export function SiteHeader() {
  const { isAuthenticated, esAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const ruta = useRutaOpcional();
  const cantidadRutas = ruta?.rutas.length ?? 0;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuAbierto) return;

    const cerrar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };
    document.addEventListener("keydown", cerrar);
    return () => document.removeEventListener("keydown", cerrar);
  }, [menuAbierto]);

  async function cerrarSesion() {
    setMenuAbierto(false);
    await logout();
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = consulta.trim();
    setMenuAbierto(false);
    navigate(texto ? `/destinos?q=${encodeURIComponent(texto)}` : "/destinos");
  }

  return (
    <header className="chuki-site-header">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-[var(--color-surface)] focus:px-4 focus:py-3 focus:font-bold"
      >
        Saltar al contenido
      </a>
      <div className="chuki-site-header__inner">
        <Link
          to="/"
          className="chuki-brand"
        >
          ✺ CHUKIYAPU
          <small>ATLAS VIVO DE LOS ANDES</small>
          <span className="sr-only">La Paz en movimiento · Inicio</span>
        </Link>

        <nav aria-label="Navegación principal" className="chuki-site-header__nav">
          {ENLACES.map((enlace) => {
            const esPlanificador = enlace.destino.includes("vista=armar");
            const esExperiencias = enlace.destino.includes("#experiencias");
            const activo =
              enlace.destino === "/"
                ? location.pathname === "/" && location.hash === ""
                : esExperiencias
                  ? location.pathname === "/" &&
                    location.hash === "#experiencias"
                : enlace.destino.startsWith("/destinos")
                  ? location.pathname === "/destinos" &&
                    (esPlanificador
                      ? location.search.includes("vista=armar")
                      : !location.search.includes("vista=armar"))
                  : false;
            return (
              <Link
                key={enlace.destino}
                to={enlace.destino}
                aria-current={activo ? "page" : undefined}
                className={activo ? "active" : ""}
              >
                {enlace.etiqueta}
              </Link>
            );
          })}
        </nav>

        <form className="chuki-site-header__search" role="search" onSubmit={buscar}>
          <label className="sr-only" htmlFor="buscar-destinos">
            Buscar en La Paz
          </label>
          <Icono nombre="buscar" className="h-4 w-4" />
          <input
            id="buscar-destinos"
            type="search"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Buscar en La Paz"
          />
        </form>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink
            to="/ruta"
            variante="route"
            className="chuki-site-header__action"
          >
            <Icono nombre="ruta" className="h-4 w-4" />
            Mi viaje
            <span className="grid min-w-6 place-items-center rounded-full bg-white/20 px-1.5 py-0.5 font-data text-xs">
              {cantidadRutas}
            </span>
            <span className="sr-only">
              {cantidadRutas === 1 ? "ruta" : "rutas"}
            </span>
          </ButtonLink>
          <ButtonLink
            to={isAuthenticated ? "/mi-cuenta" : "/login"}
            variante="secondary"
            className="chuki-site-header__action"
          >
            <Icono nombre="usuario" className="h-4 w-4" />
            {isAuthenticated ? "Cuenta" : "Ingresar"}
          </ButtonLink>
          {esAdmin && (
            <ButtonLink to="/mi-cuenta/destinos" variante="quiet">
              Administrar
            </ButtonLink>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuAbierto((valor) => !valor)}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            className="chuki-site-header__menu"
        >
          <Icono nombre={menuAbierto ? "cerrar" : "menu"} className="h-5 w-5" />
        </button>
      </div>

      {menuAbierto && (
        <div
          id="menu-movil"
          ref={menuRef}
          className="chuki-site-header__mobile"
        >
          <nav aria-label="Navegación móvil" className="contenedor-amplio grid gap-2">
            <form className="lp-header-search lp-header-search--movil" role="search" onSubmit={buscar}>
              <label className="sr-only" htmlFor="buscar-destinos-movil">
                Buscar en La Paz
              </label>
              <Icono nombre="buscar" className="h-4 w-4" />
              <input
                id="buscar-destinos-movil"
                type="search"
                value={consulta}
                onChange={(evento) => setConsulta(evento.target.value)}
                placeholder="Buscar en La Paz"
              />
            </form>
            {ENLACES.map((enlace) => (
              <Link
                key={enlace.destino}
                to={enlace.destino}
                onClick={() => setMenuAbierto(false)}
                className="flex min-h-12 items-center justify-between border-b border-white/15 px-2 text-base font-bold"
              >
                {enlace.etiqueta}
                <Icono nombre="flecha" className="h-4 w-4" />
              </Link>
            ))}
            <Link
              to="/ruta"
              onClick={() => setMenuAbierto(false)}
              className="lp-button lp-button--route mt-2 flex min-h-12 items-center justify-between px-4 font-bold"
            >
              Mi viaje
              <span className="font-data">{cantidadRutas}</span>
              <span className="sr-only">
                {cantidadRutas === 1 ? "ruta" : "rutas"}
              </span>
            </Link>
            <Link
              to={isAuthenticated ? "/mi-cuenta" : "/login"}
              onClick={() => setMenuAbierto(false)}
              className="lp-button lp-button--secondary flex min-h-12 items-center px-4 font-bold"
            >
              {isAuthenticated ? "Mi cuenta" : "Iniciar sesión"}
            </Link>
            {esAdmin && (
              <Link
                to="/mi-cuenta/destinos"
                onClick={() => setMenuAbierto(false)}
                className="lp-button lp-button--quiet flex min-h-12 items-center px-4 font-bold"
              >
                Administración
              </Link>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => void cerrarSesion()}
                className="min-h-12 px-4 text-left text-sm font-bold text-[var(--color-danger)]"
              >
                Cerrar sesión
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
