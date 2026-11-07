/**
 * Título del documento por ruta.
 *
 * Mantiene `document.title` sincronizado con la vista actual para que la
 * pestaña, el historial y los lectores de pantalla identifiquen cada
 * página. Las vistas con datos propios (detalle de un destino) pueden
 * sobrescribirlo con `useTituloDocumento`.
 */

import { useEffect } from "react";

const MARCA = "Turismo La Paz";

const TITULOS: ReadonlyArray<{ patron: RegExp; titulo: string }> = [
  { patron: /^\/$/, titulo: `${MARCA} · Descubre la ciudad` },
  { patron: /^\/destinos\/[^/]+\/?$/, titulo: `Destino · ${MARCA}` },
  { patron: /^\/destinos\/?$/, titulo: `Catálogo de destinos · ${MARCA}` },
  { patron: /^\/login\/?$/, titulo: `Iniciar sesión · ${MARCA}` },
  { patron: /^\/registro\/?$/, titulo: `Crear cuenta · ${MARCA}` },
  {
    patron: /^\/mi-cuenta\/preferencias\/?$/,
    titulo: `Preferencias de viaje · ${MARCA}`,
  },
  { patron: /^\/mi-cuenta\/usuarios\/?$/, titulo: `Usuarios · ${MARCA}` },
  {
    patron: /^\/mi-cuenta\/destinos\/nuevo\/?$/,
    titulo: `Nuevo destino · ${MARCA}`,
  },
  {
    patron: /^\/mi-cuenta\/destinos\/[^/]+\/editar\/?$/,
    titulo: `Editar destino · ${MARCA}`,
  },
  { patron: /^\/mi-cuenta\/destinos\/?$/, titulo: `Destinos · ${MARCA}` },
  { patron: /^\/mi-cuenta\/?$/, titulo: `Mi cuenta · ${MARCA}` },
];

/** Fija `document.title` para la ruta indicada. */
export function useTituloRuta(pathname: string) {
  useEffect(() => {
    const coincidencia = TITULOS.find(({ patron }) => patron.test(pathname));

    document.title = coincidencia?.titulo ?? MARCA;
  }, [pathname]);
}
