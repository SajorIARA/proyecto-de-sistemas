/**
 * Estado, carga y validación del formulario de alta/edición de destinos.
 *
 * La validación vive aquí, y no solo en el backend, por dos razones:
 *
 * 1. `AtractivoAdminSerializer` **no** valida que `duracion_minutos` sea
 *    mayor que cero. Solo lo hace el CHECK de Postgres
 *    (`duracion_minutos > 0 OR NULL`), y cuando lo incumple Django responde
 *    500 con el traceback. Verificado en vivo. Este módulo rechaza `0` y
 *    valores negativos antes de que la petición salga.
 * 2. Los límites de longitud (`nombre` 200, `direccion` 300) y el rango de
 *    las coordenadas se avisan al instante, sin un viaje de ida y vuelta.
 *
 * `validarFormulario` es una función pura: si hay errores, no se manda nada.
 * El backend sigue siendo la autoridad y sus mensajes se pintan igual, pero
 * el frontend no depende de un 500 para descubrir un dato inválido.
 */

import {
  DIRECCION_MAX,
  DURACION_MIN_MINUTOS,
  FUENTE_ORIGEN_MAX,
  FUENTE_ORIGEN_POR_DEFECTO,
  NOMBRE_MAX,
  RANGO_COORDENADA,
} from "../../../../config/turismo";
import type { AtractivoAdmin, DestinoFormValues } from "../../../../types/turismo";

/** Subconjunto de `CampoFormulario` que el formulario puede señalar. */
export type CampoFormularioDestino =
  | "nombre"
  | "descripcion"
  | "direccion"
  | "duracionMinutos"
  | "longitud"
  | "latitud"
  | "categorias"
  | "fuenteOrigen";

export type ErroresFormulario = Partial<Record<CampoFormularioDestino, string[]>>;

/** Formulario vacío para un destino nuevo. */
export const VALORES_INICIALES: DestinoFormValues = {
  nombre: "",
  descripcion: "",
  direccion: "",
  duracionMinutos: "",
  longitud: "",
  latitud: "",
  categorias: [],
  fuenteOrigen: FUENTE_ORIGEN_POR_DEFECTO,
  activo: true,
};

/**
 * Pasa un número del backend a texto editable.
 *
 * `String(68.1375)` da "68.1375", que es lo que espera el input numérico.
 * DRF serializa el `PointField` con la precisión del `GEOMETRY_KEYWORD` de
 * GeoJSON, así que no hace falta redondear nada aquí.
 */
function coordenadaATexto(valor: number | null | undefined): string {
  return typeof valor === "number" && Number.isFinite(valor)
    ? String(valor)
    : "";
}

/** Rellena el formulario con los datos de un destino existente. */
export function valoresDesdeDestino(destino: AtractivoAdmin): DestinoFormValues {
  return {
    nombre: destino.nombre ?? "",
    descripcion: destino.descripcion ?? "",
    direccion: destino.direccion ?? "",
    duracionMinutos:
      destino.duracion_minutos === null || destino.duracion_minutos === undefined
        ? ""
        : String(destino.duracion_minutos),
    longitud: coordenadaATexto(destino.ubicacion?.longitud),
    latitud: coordenadaATexto(destino.ubicacion?.latitud),
    categorias: [...(destino.categorias ?? [])],
    fuenteOrigen: destino.fuente_origen || FUENTE_ORIGEN_POR_DEFECTO,
    activo: destino.activo !== false,
  };
}

/** Texto a número, tolerando coma decimal y espacios. `null` si no es número. */
function aNumero(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");

  if (limpio === "") {
    return null;
  }

  const valor = Number(limpio);

  return Number.isFinite(valor) ? valor : null;
}

/** Valida un campo de coordenadas y devuelve su mensaje, o `null`. */
function validarCoordenada(
  texto: string,
  etiqueta: string,
  rango: { min: number; max: number },
): string | null {
  const valor = aNumero(texto);

  if (valor === null) {
    return `Ingresá la ${etiqueta} del destino.`;
  }

  if (valor < rango.min || valor > rango.max) {
    return `La ${etiqueta} debe estar entre ${rango.min} y ${rango.max}.`;
  }

  return null;
}

/**
 * Valida el formulario completo.
 *
 * Devuelve un objeto **vacío** cuando todo está bien; si no, un mensaje por
 * campo con el nombre del input, para pintarlo debajo.
 */
export function validarFormulario(valores: DestinoFormValues): ErroresFormulario {
  const errores: ErroresFormulario = {};

  const nombre = valores.nombre.trim();

  if (nombre === "") {
    errores.nombre = ["El nombre del destino es obligatorio."];
  } else if (nombre.length > NOMBRE_MAX) {
    errores.nombre = [
      `El nombre no puede superar los ${NOMBRE_MAX} caracteres (tiene ${nombre.length}).`,
    ];
  }

  if (valores.descripcion.trim() === "") {
    errores.descripcion = [
      "Escribí una descripción: es lo que el turista lee en la card del catálogo.",
    ];
  }

  const direccion = valores.direccion.trim();

  if (direccion.length > DIRECCION_MAX) {
    errores.direccion = [
      `La dirección no puede superar los ${DIRECCION_MAX} caracteres (tiene ${direccion.length}).`,
    ];
  }

  const duracion = aNumero(valores.duracionMinutos);

  if (valores.duracionMinutos.trim() !== "" && duracion === null) {
    errores.duracionMinutos = ["La duración debe ser un número de minutos."];
  } else if (duracion !== null && duracion < DURACION_MIN_MINUTOS) {
    //Este caso nunca debe llegar al backend: dispara el CHECK y devuelve 500.
    errores.duracionMinutos = [
      `La duración debe ser de al menos ${DURACION_MIN_MINUTOS} minuto. Dejalo vacío si no la conocés.`,
    ];
  }

  const errorLongitud = validarCoordenada(
    valores.longitud,
    "longitud",
    RANGO_COORDENADA.longitud,
  );

  if (errorLongitud) {
    errores.longitud = [errorLongitud];
  }

  const errorLatitud = validarCoordenada(
    valores.latitud,
    "latitud",
    RANGO_COORDENADA.latitud,
  );

  if (errorLatitud) {
    errores.latitud = [errorLatitud];
  }

  const fuente = valores.fuenteOrigen.trim();

  if (fuente.length > FUENTE_ORIGEN_MAX) {
    errores.fuenteOrigen = [
      `La fuente no puede superar los ${FUENTE_ORIGEN_MAX} caracteres (tiene ${fuente.length}).`,
    ];
  }

  return errores;
}

/** ¿El formulario pasa todas las validaciones? */
export function esFormularioValido(valores: DestinoFormValues): boolean {
  return Object.keys(validarFormulario(valores)).length === 0;
}

/**
 * Agrega o quita una categoría del formulario.
 *
 * Devuelve un array nuevo para que React detecte el cambio: mutar el que
 * viene en props dejaría la casilla sin repintar.
 */
export function alternarCategoria(
  categorias: number[],
  id: number,
): number[] {
  return categorias.includes(id)
    ? categorias.filter((categoria) => categoria !== id)
    : [...categorias, id];
}

/**
 * Filtra el listado admin por estado y texto.
 *
 * Se hace en el cliente porque `AtractivoAdminViewSet` no define
 * `filter_backends` ni `get_queryset`: el backend no acepta `?q=` ni
 * `?activo=` y devuelve siempre la primera página completa.
 */
export function filtrarDestinos(
  destinos: AtractivoAdmin[],
  {
    estado,
    texto,
  }: {
    estado: "activos" | "inactivos" | "todos";
    texto: string;
  },
): AtractivoAdmin[] {
  const busqueda = texto.trim().toLowerCase();

  return destinos.filter((destino) => {
    if (estado === "activos" && !destino.activo) {
      return false;
    }

    if (estado === "inactivos" && destino.activo) {
      return false;
    }

    if (busqueda === "") {
      return true;
    }

    return (
      destino.nombre.toLowerCase().includes(busqueda) ||
      destino.descripcion.toLowerCase().includes(busqueda) ||
      (destino.direccion ?? "").toLowerCase().includes(busqueda)
    );
  });
}