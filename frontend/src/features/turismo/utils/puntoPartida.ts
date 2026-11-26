/**
 * Punto de partida del constructor de ruta.
 *
 * El origen puede ser la ubicación actual del turista (GPS) o un punto que
 * marca en el mapa. Se guarda en la URL, igual que el resto de los filtros del
 * catálogo, para que se pueda compartir y sobreviva a la navegación entre
 * pasos. El backend sigue siendo el único que calcula la ruta por calles;
 * aquí solo se valida el área de La Paz para dar feedback inmediato.
 */

import { LA_PAZ_BBOX } from "../../../config/preferencias";

export type TipoPuntoPartida = "gps" | "mapa";

export interface PuntoPartidaRuta {
  latitud: number;
  longitud: number;
  tipo: TipoPuntoPartida;
}

const PARAMETRO_LATITUD = "origen_lat";
const PARAMETRO_LONGITUD = "origen_lon";
const PARAMETRO_TIPO = "origen_tipo";

/** Mismo bbox que valida el backend para `punto_partida`. */
export function esPuntoDentroDeLaPaz(
  latitud: number,
  longitud: number,
): boolean {
  return (
    Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    latitud >= LA_PAZ_BBOX.latitud.min &&
    latitud <= LA_PAZ_BBOX.latitud.max &&
    longitud >= LA_PAZ_BBOX.longitud.min &&
    longitud <= LA_PAZ_BBOX.longitud.max
  );
}

/** Normaliza y valida un punto; devuelve `null` si cae fuera del área. */
export function crearPuntoPartida(
  latitud: number,
  longitud: number,
  tipo: TipoPuntoPartida,
): PuntoPartidaRuta | null {
  if (!esPuntoDentroDeLaPaz(latitud, longitud)) {
    return null;
  }

  return {
    latitud: Number(latitud.toFixed(6)),
    longitud: Number(longitud.toFixed(6)),
    tipo,
  };
}

/** Lee el origen de los query params; los valores inválidos se ignoran. */
export function leerPuntoPartida(
  parametros: URLSearchParams,
): PuntoPartidaRuta | null {
  const tipo = parametros.get(PARAMETRO_TIPO);
  const textoLatitud = parametros.get(PARAMETRO_LATITUD);
  const textoLongitud = parametros.get(PARAMETRO_LONGITUD);

  if ((tipo !== "gps" && tipo !== "mapa") || !textoLatitud || !textoLongitud) {
    return null;
  }

  const latitud = Number(textoLatitud);
  const longitud = Number(textoLongitud);

  return crearPuntoPartida(latitud, longitud, tipo);
}

/** Devuelve una copia de los params con el origen fijado o eliminado. */
export function conPuntoPartida(
  parametros: URLSearchParams,
  punto: PuntoPartidaRuta | null,
): URLSearchParams {
  const actualizados = new URLSearchParams(parametros);

  if (punto === null) {
    actualizados.delete(PARAMETRO_LATITUD);
    actualizados.delete(PARAMETRO_LONGITUD);
    actualizados.delete(PARAMETRO_TIPO);
    return actualizados;
  }

  actualizados.set(PARAMETRO_LATITUD, String(punto.latitud));
  actualizados.set(PARAMETRO_LONGITUD, String(punto.longitud));
  actualizados.set(PARAMETRO_TIPO, punto.tipo);
  return actualizados;
}

/** Etiqueta visible del tipo de origen elegido. */
export function etiquetaPuntoPartida(punto: PuntoPartidaRuta): string {
  return punto.tipo === "gps" ? "Ubicación actual" : "Punto en el mapa";
}

/** Coordenadas compactas para confirmar al turista qué punto quedó fijado. */
export function formatearCoordenadas(punto: PuntoPartidaRuta): string {
  return `${punto.latitud.toFixed(4)}, ${punto.longitud.toFixed(4)}`;
}
