import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTituloRuta } from "../hooks/useTituloRuta";

/**
 * Layout raíz: envuelve TODAS las rutas de la aplicación.
 *
 * Garantiza que al cambiar de ruta el scroll vuelva al inicio de forma
 * instantánea y consistente en cualquier vista (catálogo, detalle, auth,
 * perfil, admin…). Si la ruta trae un ancla (`/#zonas`), se respeta y se
 * desplaza hasta esa sección. Se usa `behavior: "instant"` para vencer el
 * `scroll-behavior: smooth` global de `index.css` en los cambios de
 * página; dentro de la misma página el salto es suave.
 */
export function AppLayout() {
  const { pathname, hash } = useLocation();
  const rutaAnterior = useRef(pathname);

  useTituloRuta(pathname);

  useEffect(() => {
    const cambioDeRuta = rutaAnterior.current !== pathname;
    rutaAnterior.current = pathname;

    if (hash.length > 1) {
      const destino = document.getElementById(
        decodeURIComponent(hash.slice(1)),
      );

      if (destino) {
        destino.scrollIntoView({
          behavior: cambioDeRuta ? "instant" : "smooth",
          block: "start",
        });
        return;
      }
    }

    if (cambioDeRuta) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, hash]);

  return <Outlet />;
}
