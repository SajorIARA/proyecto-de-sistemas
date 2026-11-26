/**
 * Respuestas deterministas apoyadas en datos reales del catálogo.
 *
 * Antes vivían dentro del chat flotante; se extraen para que el adaptador del
 * asistente pueda degradar al catálogo con la misma lógica que usaba la UI
 * cuando el endpoint RAG no respondía.
 */

import type { Atractivo } from "../../../types/turismo";

/** Normaliza acentos y mayúsculas para comparar texto en español. */
export function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Detecta saludos breves, que no justifican una búsqueda en el catálogo. */
export function esSaludo(texto: string): boolean {
  const normalizado = normalizar(texto).trim();

  return (
    normalizado.length <= 30 &&
    ["hola", "buenas", "hey", "buen dia", "saludos"].some((saludo) =>
      normalizado.includes(saludo),
    )
  );
}

/**
 * Busca una coincidencia por nombre, descripción o dirección y devuelve una
 * respuesta con campos verificados del catálogo. Sin coincidencia, devuelve
 * `null` para que el adaptador caiga al motor local de estimaciones.
 */
export function respuestaDesdeCatalogo(
  pregunta: string,
  destinos: Atractivo[],
): string | null {
  if (esSaludo(pregunta)) {
    return null;
  }

  const terminos = normalizar(pregunta)
    .split(/[^a-z0-9]+/)
    .filter((termino) => termino.length >= 4);

  const destino = destinos.find((item) => {
    const texto = normalizar(
      `${item.nombre} ${item.descripcion} ${item.direccion ?? ""}`,
    );

    return terminos.some((termino) => texto.includes(termino));
  });

  if (!destino) return null;

  const ubicacion = destino.direccion?.trim()
    ? ` Se encuentra en ${destino.direccion.trim()}.`
    : "";
  const categorias = destino.categorias.length
    ? ` Pertenece a ${destino.categorias.join(", ")}.`
    : "";
  const descripcion = destino.descripcion?.trim()
    ? ` ${destino.descripcion.trim()}`
    : "";

  return `En el catálogo encontré ${destino.nombre}.${categorias}${ubicacion}${descripcion} Puedes abrir «Explorar» para ver la información completa.`;
}
