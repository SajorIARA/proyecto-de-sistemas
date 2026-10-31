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
    // Un enlace profundo con `#seccion` (por ejemplo `/#zonas`) debe
    // respetar el ancla; si no hay hash, la navegación vuelve arriba.
    const hash = window.location.hash;

    if (hash.length > 1) {
      const destino = document.getElementById(decodeURIComponent(hash.slice(1)));

      if (destino) {
        destino.scrollIntoView({ behavior: "instant", block: "start" });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return <Outlet />;
}