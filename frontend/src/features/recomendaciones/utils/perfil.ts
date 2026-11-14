/**
 * Construcción del perfil de búsqueda de recomendaciones.
 *
 * La pantalla parte de la última consulta guardada por el turista (cada
 * `POST /recomendar/` persiste una) y, si no existe, del borrador de
 * preferencias del navegador. El punto de partida siempre cae dentro del
 * área de La Paz: si el turista no lo definió se usa el centroide de un
 * macrodistrito.
 */

import {
  DURACION,
  LA_PAZ_BBOX,
  MACRODISTRITOS_LA_PAZ,
  PRESUPUESTO_BOB,
} from "../../../config/preferencias";
import { RECOMENDACIONES_POR_DEFECTO } from "../../../config/recomendaciones";
import type {
  ConsultaRecomendacion,
  PreferenciasFormValues,
} from "../../../types/preferencias";
import type {
  PerfilBusqueda,
  RecomendacionInput,
} from "../../../types/recomendaciones";
import {
  duracionAHoras,
  parsearCoordenada,
} from "../../preferencias/utils/validaciones";

const CENTRO = MACRODISTRITOS_LA_PAZ.find(
  (macrodistrito) => macrodistrito.nombre === "Centro",
) ?? { nombre: "Centro", latitud: -16.495, longitud: -68.134 };

function redondear(valor: number, decimales = 2): number {
  return Number(valor.toFixed(decimales));
}

function numeroFinito(valor: unknown, porDefecto: number): number {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : porDefecto;
}

/** Lee un WKT de PostGIS (`SRID=4326;POINT (lon lat)`) como [lon, lat]. */
export function parsearPuntoWkt(
  wkt: string | null | undefined,
): [number, number] | null {
  if (typeof wkt !== "string") {
    return null;
  }

  const coincidencia = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(
    wkt,
  );

  if (!coincidencia) {
    return null;
  }

  const longitud = Number(coincidencia[1]);
  const latitud = Number(coincidencia[2]);

  if (!Number.isFinite(longitud) || !Number.isFinite(latitud)) {
    return null;
  }

  return [longitud, latitud];
}

/** Macrodistrito cuyo centroide está más cerca de una coordenada. */
export function macrodistritoMasCercano(
  latitud: number,
  longitud: number,
): string {
  let mejor = "";
  let menorDistancia = Number.POSITIVE_INFINITY;

  for (const macrodistrito of MACRODISTRITOS_LA_PAZ) {
    const distancia = Math.hypot(
      macrodistrito.latitud - latitud,
      macrodistrito.longitud - longitud,
    );

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      mejor = macrodistrito.nombre;
    }
  }

  // ~0.005° ≈ 500 m: fuera de ese margen se considera un punto propio.
  return menorDistancia <= 0.005 ? mejor : "";
}

/** Convierte horas a la unidad y al paso que admite el selector. */
function duracionDesdeHoras(horas: number): {
  duracionValor: number;
  duracionUnidad: "horas" | "dias";
} {
  if (horas >= 24) {
    const dias = Math.round(horas / 24 / 0.5) * 0.5;

    return {
      duracionValor: Math.min(Math.max(dias, 0.5), DURACION.dias.max),
      duracionUnidad: "dias",
    };
  }

  const horasEnteras = Math.round(horas);

  return {
    duracionValor: Math.min(Math.max(horasEnteras, 1), DURACION.horas.max),
    duracionUnidad: "horas",
  };
}

function coordenadasDelBorrador(
  borrador: PreferenciasFormValues,
): { latitud: number; longitud: number } | null {
  const latitud = parsearCoordenada(borrador.latitud);
  const longitud = parsearCoordenada(borrador.longitud);

  if (latitud === null || longitud === null) {
    return null;
  }

  const dentro =
    longitud >= LA_PAZ_BBOX.longitud.min &&
    longitud <= LA_PAZ_BBOX.longitud.max &&
    latitud >= LA_PAZ_BBOX.latitud.min &&
    latitud <= LA_PAZ_BBOX.latitud.max;

  return dentro ? { latitud, longitud } : null;
}

/**
 * Perfil inicial de la pantalla.
 *
 * Prioriza la última consulta guardada (presupuesto, tiempo y punto reales);
 * si todavía no hay ninguna, usa el borrador local. Radio y Top-K son
 * preferencias de la pantalla y no se guardan en el backend.
 */
export function perfilInicial(
  consulta: ConsultaRecomendacion | null,
  borrador: PreferenciasFormValues,
): PerfilBusqueda {
  const coordenadasConsulta = consulta
    ? parsearPuntoWkt(consulta.punto_partida)
    : null;
  const coordenadasBorrador = coordenadasDelBorrador(borrador);
  const macrodistritoBorrador = MACRODISTRITOS_LA_PAZ.find(
    (macrodistrito) => macrodistrito.nombre === borrador.macrodistrito,
  );
  const puntoPorDefecto = macrodistritoBorrador ?? CENTRO;

  const longitud =
    coordenadasConsulta?.[0] ??
    coordenadasBorrador?.longitud ??
    puntoPorDefecto.longitud;
  const latitud =
    coordenadasConsulta?.[1] ??
    coordenadasBorrador?.latitud ??
    puntoPorDefecto.latitud;

  const presupuesto = consulta
    ? numeroFinito(consulta.presupuesto_bob, borrador.presupuestoBob)
    : borrador.presupuestoBob;
  const horas = consulta
    ? numeroFinito(
        consulta.tiempo_horas,
        duracionAHoras(borrador.duracionValor, borrador.duracionUnidad),
      )
    : duracionAHoras(borrador.duracionValor, borrador.duracionUnidad);

  const duracion = duracionDesdeHoras(horas);

  const macrodistrito =
    consulta?.macrodistrito?.trim() ||
    macrodistritoMasCercano(latitud, longitud) ||
    borrador.macrodistrito.trim();

  return {
    presupuestoBob: Math.min(
      Math.max(Math.round(presupuesto), PRESUPUESTO_BOB.min),
      PRESUPUESTO_BOB.max,
    ),
    duracionValor: duracion.duracionValor,
    duracionUnidad: duracion.duracionUnidad,
    macrodistrito,
    latitud: redondear(latitud, 6),
    longitud: redondear(longitud, 6),
    radioKm: RECOMENDACIONES_POR_DEFECTO.radioKm,
    topK: RECOMENDACIONES_POR_DEFECTO.topK,
  };
}

/** Cambia el punto de partida al centroide del macrodistrito elegido. */
export function conMacrodistrito(
  perfil: PerfilBusqueda,
  nombre: string,
): PerfilBusqueda {
  if (nombre === "") {
    return { ...perfil, macrodistrito: "" };
  }

  const elegido = MACRODISTRITOS_LA_PAZ.find(
    (macrodistrito) => macrodistrito.nombre === nombre,
  );

  if (!elegido) {
    return perfil;
  }

  return {
    ...perfil,
    macrodistrito: elegido.nombre,
    latitud: elegido.latitud,
    longitud: elegido.longitud,
  };
}

/** Etiqueta visible del punto de partida. */
export function etiquetaPuntoPartida(perfil: PerfilBusqueda): string {
  if (perfil.macrodistrito) {
    return perfil.macrodistrito;
  }

  return "Punto guardado";
}

/** Cuerpo exacto que espera `POST /api/recomendaciones/recomendar/`. */
export function construirRecomendacionInput(
  perfil: PerfilBusqueda,
): RecomendacionInput {
  const horas = duracionAHoras(perfil.duracionValor, perfil.duracionUnidad);

  return {
    presupuesto_bob: perfil.presupuestoBob,
    tiempo_horas: redondear(horas),
    punto_partida: {
      coordinates: [perfil.longitud, perfil.latitud],
    },
    radio_km: perfil.radioKm,
    top_k: perfil.topK,
    ...(perfil.macrodistrito
      ? { macrodistrito: perfil.macrodistrito }
      : {}),
  };
}

/** Siguiente radio mayor, tope 50 km (límite del backend). */
export function ampliarRadio(radioKm: number): number {
  const siguiente =
    [...RECOMENDACIONES_POR_DEFECTO.radiosKm].find(
      (opcion) => opcion > radioKm,
    ) ?? Math.min(radioKm * 2, 50);

  return Math.min(siguiente, 50);
}
