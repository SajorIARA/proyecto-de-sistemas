import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

/**
 * Layout raíz: envuelve TODAS las rutas de la aplicación.
 *
 * Garantiza que al cambiar de ruta el scroll vuelva al inicio de forma
 * instantánea y consistente en cualquier vista (catálogo, detalle, auth,
 * perfil, admin…). Se usa `behavior: "instant"` para vencer el
 * `scroll-behavior: smooth` global de `index.css`, evitando que el
 * navegador pase suavemente por páginas largas al navegar.
 */
export function AppLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return <Outlet />;
}