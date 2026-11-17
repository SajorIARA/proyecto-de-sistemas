/**
 * Motor local de respuestas del asistente de viaje.
 *
 * Mientras el backend no exponga un endpoint de RAG (issue #28), el chat
 * responde de forma determinista con el contexto real de la pantalla: el
 * Top-K, el perfil de búsqueda y la estimación de traslados. No inventa
 * destinos: todas las respuestas se apoyan en `recomendaciones` o explican
 * que todavía no hay un ranking calculado.
 *
 * La función es pura para poder probarla sin React ni red.
 */

import type {
  ContextoAsistente,
  PerfilBusqueda,
  Recomendacion,
} from "../../../types/recomendaciones";
import { formatearBob } from "../../preferencias/utils/validaciones";
import { nivelAfinidad, porcentajeAfinidad } from "./afinidad";
import {
  estimarTraslado,
  formatearDistancia,
  formatearMinutos,
} from "./estimacionTraslado";
import { etiquetaPuntoPartida } from "./perfil";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function contiene(texto: string, claves: string[]): boolean {
  return claves.some((clave) => texto.includes(clave));
}

function formatearHoras(horas: number): string {
  const valor = Number.isFinite(horas) ? horas : 0;

  return `${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 1,
  }).format(valor)} h`;
}

function totalConTraslado(recomendacion: Recomendacion): number {
  return (
    recomendacion.costo_bob + estimarTraslado(recomendacion.distancia_km).costoBob
  );
}

function perfilTexto(perfil: PerfilBusqueda): string {
  const horas = perfil.duracionUnidad === "dias"
    ? perfil.duracionValor * 24
    : perfil.duracionValor;

  return `${formatearBob(perfil.presupuestoBob)}, ${formatearHoras(horas)} y salida desde ${etiquetaPuntoPartida(perfil)}`;
}

function listarDestinos(destinos: Recomendacion[], maximo = 3): string {
  return destinos
    .slice(0, maximo)
    .map(
      (destino) =>
        `${destino.nombre} (${porcentajeAfinidad(destino.puntaje)} %)`,
    )
    .join(" · ");
}

function respuestaSinDatos(perfil: PerfilBusqueda): string {
  return `Todavía no tengo un ranking calculado para tu perfil (${perfilTexto(
    perfil,
  )}). Pulsá «Actualizar ranking» o ampliá el radio de búsqueda; en cuanto tenga resultados puedo comparar costos, distancias y tiempos.`;
}

function respuestaInicial(perfil: PerfilBusqueda): string {
  return `Hola, soy tu asistente de viaje. Puedo ayudarte a elegir entre tus recomendaciones, comparar el costo total en bolivianos y estimar los traslados. Tu perfil actual: ${perfilTexto(
    perfil,
  )}.`;
}

function respuestaMejor(contexto: ContextoAsistente): string {
  const { recomendaciones, perfil } = contexto;
  const mejor = recomendaciones[0];
  const porcentaje = porcentajeAfinidad(mejor.puntaje);
  const nivel = nivelAfinidad(porcentaje);
  const resto = recomendaciones.slice(1, 3);

  const cierre =
    resto.length > 0
      ? ` Le siguen ${listarDestinos(resto, 2)}.`
      : " Es la única opción que entra en tu perfil por ahora.";

  return `Con tu perfil (${perfilTexto(perfil)}), ${mejor.nombre} es la mejor coincidencia: ${porcentaje} % de afinidad (${nivel.etiqueta.toLowerCase()}).${cierre} Si querés, te comparo el costo total o el traslado.`;
}

function respuestaEconomica(contexto: ContextoAsistente): string {
  const { recomendaciones, perfil } = contexto;
  const ordenadas = [...recomendaciones].sort(
    (a, b) => totalConTraslado(a) - totalConTraslado(b),
  );
  const economica = ordenadas[0];
  const traslado = estimarTraslado(economica.distancia_km);
  const total = totalConTraslado(economica);
  const mejor = recomendaciones[0];

  const comparacion =
    mejor && mejor.id_atractivo !== economica.id_atractivo
      ? ` La mejor coincidencia, ${mejor.nombre}, tiene un total de ≈ ${formatearBob(
          totalConTraslado(mejor),
        )}.`
      : "";

  return `La opción más económica del Top-K es ${economica.nombre}: ${formatearBob(
    economica.costo_bob,
  )} de entrada y ≈ ${formatearBob(
    traslado.costoBob,
  )} de traslado ida y vuelta, total ≈ ${formatearBob(
    total,
  )}. Tu tope es ${formatearBob(perfil.presupuestoBob)}.${comparacion}`;
}

function respuestaCercana(contexto: ContextoAsistente): string {
  const { recomendaciones, perfil } = contexto;
  const cercana = [...recomendaciones].sort(
    (a, b) => a.distancia_km - b.distancia_km,
  )[0];
  const traslado = estimarTraslado(cercana.distancia_km);

  return `El destino más cercano es ${cercana.nombre}, a ${formatearDistancia(
    cercana.distancia_km,
  )} desde ${etiquetaPuntoPartida(
    perfil,
  )}. El traslado ida y vuelta toma ≈ ${formatearMinutos(
    traslado.minutos,
  )} y cuesta ≈ ${formatearBob(traslado.costoBob)}.`;
}

function respuestaCosto(contexto: ContextoAsistente): string {
  const { recomendaciones, perfil } = contexto;
  const mejor = recomendaciones[0];
  const traslado = estimarTraslado(mejor.distancia_km);
  const total = totalConTraslado(mejor);

  return `Para ${mejor.nombre} calculo ${formatearBob(
    mejor.costo_bob,
  )} de entrada, ≈ ${formatearBob(
    traslado.costoBob,
  )} de traslado ida y vuelta y un total de ≈ ${formatearBob(
    total,
  )}. Tu presupuesto tope es ${formatearBob(
    perfil.presupuestoBob,
  )}, así que ${total <= perfil.presupuestoBob ? "entra sin problema" : "conviene ajustar el plan"}.`;
}

function respuestaTraslado(contexto: ContextoAsistente): string {
  const { recomendaciones, perfil } = contexto;
  const mejor = recomendaciones[0];
  const traslado = estimarTraslado(mejor.distancia_km);

  return `${mejor.nombre} está a ${formatearDistancia(
    mejor.distancia_km,
  )} desde ${etiquetaPuntoPartida(
    perfil,
  )}. Ida y vuelta: ≈ ${formatearMinutos(
    traslado.minutos,
  )} y ≈ ${formatearBob(
    traslado.costoBob,
  )}. Es una estimación referencial en transporte urbano; el teleférico o caminar pueden cambiar el tiempo y el costo.`;
}

function respuestaTiempo(contexto: ContextoAsistente): string {
  const { recomendaciones, perfil } = contexto;
  const mejor = recomendaciones[0];
  const traslado = estimarTraslado(mejor.distancia_km);
  const horasPerfil = perfil.duracionUnidad === "dias"
    ? perfil.duracionValor * 24
    : perfil.duracionValor;
  const totalMinutos = mejor.duracion_horas * 60 + traslado.minutos;

  return `${mejor.nombre} requiere una visita de ≈ ${formatearHoras(
    mejor.duracion_horas,
  )}. Sumando ${formatearMinutos(
    traslado.minutos,
  )} de traslado, el plan toma ≈ ${formatearMinutos(
    totalMinutos,
  )} de tu ventana de ${formatearHoras(horasPerfil)}.`;
}

const CATEGORIAS_CLAVE: { nombre: string; claves: string[] }[] = [
  { nombre: "cultura", claves: ["cultura", "museo", "historia", "patrimonio"] },
  {
    nombre: "gastronomia",
    claves: ["gastronom", "comida", "comer", "plato", "mercado", "cafe"],
  },
  {
    nombre: "aventura",
    claves: ["aventur", "trekking", "caminata", "adrenalina", "bici"],
  },
  {
    nombre: "naturaleza",
    claves: ["naturalez", "valle", "montana", "aire libre", "parque", "verde"],
  },
  {
    nombre: "miradores",
    claves: ["mirador", "vista", "panoram", "foto", "atardecer"],
  },
  {
    nombre: "arqueologia",
    claves: ["arqueolog", "ruina", "tiwanaku", "ancestral"],
  },
];

function respuestaCategoria(
  contexto: ContextoAsistente,
  categoria: string,
): string {
  const coincidencias = contexto.recomendaciones.filter((destino) =>
    destino.categorias.some(
      (nombre) => normalizar(nombre) === normalizar(categoria),
    ),
  );

  if (coincidencias.length === 0) {
    return `No hay destinos de ${categoria} dentro de tu radio actual de ${contexto.perfil.radioKm} km. Probá ampliar el radio o revisar tus preferencias; el mejor match general sigue siendo ${contexto.recomendaciones[0].nombre}.`;
  }

  return `Dentro de tu radio actual encontré ${coincidencias.length} ${
    coincidencias.length === 1 ? "opción" : "opciones"
  } de ${categoria}: ${listarDestinos(
    coincidencias,
  )}. Puedo darte el costo total o el traslado del que te interese.`;
}

function respuestaGeneral(contexto: ContextoAsistente): string {
  const mejor = contexto.recomendaciones[0];
  const porcentaje = porcentajeAfinidad(mejor.puntaje);

  return `Puedo comparar tus recomendaciones por afinidad, costo total o cercanía. Ahora mismo el mejor match es ${mejor.nombre} con ${porcentaje} % de afinidad; el más económico es ${
    [...contexto.recomendaciones].sort(
      (a, b) => totalConTraslado(a) - totalConTraslado(b),
    )[0].nombre
  }. Preguntame, por ejemplo: «¿cuánto gastaré?» o «¿qué está más cerca?».`;
}

/**
 * Devuelve la respuesta completa del asistente para una pregunta.
 *
 * El orden de intenciones importa: saludos y consultas concretas se
 * resuelven antes que la respuesta general.
 */
export function responderAsistente(
  pregunta: string,
  contexto: ContextoAsistente,
): string {
  const texto = normalizar(pregunta).trim();

  if (texto === "") {
    return respuestaInicial(contexto.perfil);
  }

  if (contexto.recomendaciones.length === 0) {
    return respuestaSinDatos(contexto.perfil);
  }

  if (
    texto.length <= 30 &&
    contiene(texto, ["hola", "buenas", "hey", "buen dia", "saludos"])
  ) {
    return respuestaInicial(contexto.perfil);
  }

  const categoria = CATEGORIAS_CLAVE.find(({ claves }) =>
    contiene(texto, claves),
  );

  if (categoria) {
    return respuestaCategoria(contexto, categoria.nombre);
  }

  if (contiene(texto, ["barat", "economic", "gratis", "ahorrar", "poco dinero"])) {
    return respuestaEconomica(contexto);
  }

  if (contiene(texto, ["cerca", "cercan", "cercano", "proximo", "proxima"])) {
    return respuestaCercana(contexto);
  }

  if (
    contiene(texto, [
      "cuanto gast",
      "cuanto cuesta",
      "cuanto sale",
      "presupuesto",
      "costo",
      "plata",
      "boliviano",
      "total",
      "gastar",
    ])
  ) {
    return respuestaCosto(contexto);
  }

  if (
    contiene(texto, [
      "traslado",
      "taxi",
      "llegar",
      "llego",
      "movilidad",
      "transporte",
      "como voy",
    ])
  ) {
    return respuestaTraslado(contexto);
  }

  if (
    contiene(texto, [
      "tiempo",
      "dura",
      "cuanto tarda",
      "horas",
      "demora",
      "recorrido",
    ])
  ) {
    return respuestaTiempo(contexto);
  }

  if (
    contiene(texto, [
      "mejor",
      "conviene",
      "recomienda",
      "suger",
      "visitar",
      "hacer",
      "plan",
      "ruta",
      "que elijo",
      "donde voy",
    ])
  ) {
    return respuestaMejor(contexto);
  }

  return respuestaGeneral(contexto);
}
