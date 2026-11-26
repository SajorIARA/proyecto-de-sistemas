/**
 * Adaptador del chat del asistente.
 *
 * Se consulta el endpoint RAG con la pregunta del usuario y se usa su
 * respuesta documentada con citas. Si el servicio falla, devuelve una
 * degradación explícita: primero datos reales del catálogo (cuando están
 * disponibles) y, si no, el motor local determinista. En ambos casos se
 * informa el `origen` y un `aviso` para no simular éxito RAG.
 *
 * Contrato del endpoint RAG:
 *
 *   POST <VITE_ASISTENTE_CHAT_URL>
 *   { pregunta: string, top_k: number }
 *   → { origen: "rag", respuesta: string, citas: CitaRAG[], recuperados, ... }
 */

import { api } from "../../../api/http";
import { ASISTENTE } from "../../../config/recomendaciones";
import type {
  CitaAsistente,
  ContextoAsistente,
  RespuestaAsistente,
} from "../../../types/recomendaciones";
import type { Atractivo } from "../../../types/turismo";
import { respuestaDesdeCatalogo } from "../utils/respuestaCatalogo";
import { responderAsistente } from "../utils/asistente";

const AVISO_CATALOGO =
  "El asistente documental no está disponible; esta respuesta usa datos del catálogo.";
const AVISO_LOCAL =
  "El asistente documental no está disponible; esta respuesta usa tus recomendaciones y estimaciones.";

function extraerTexto(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const objeto = data as Record<string, unknown>;

  for (const clave of ["respuesta", "texto", "message"]) {
    const valor = objeto[clave];

    if (typeof valor === "string" && valor.trim()) {
      return valor.trim();
    }
  }

  return null;
}

/** Convierte las citas del serializer al contrato que consume la UI. */
function extraerCitas(data: unknown): CitaAsistente[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const valor = (data as Record<string, unknown>).citas;

  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((cita: unknown): CitaAsistente[] => {
    if (!cita || typeof cita !== "object") {
      return [];
    }

    const objeto = cita as Record<string, unknown>;

    if (typeof objeto.titulo !== "string" || !objeto.titulo.trim()) {
      return [];
    }

    const idFragmento =
      typeof objeto.id_fragmento === "number" ? objeto.id_fragmento : undefined;
    const numeroFragmento =
      typeof objeto.numero_fragmento === "number"
        ? objeto.numero_fragmento
        : undefined;

    return [
      {
        titulo: objeto.titulo.trim(),
        url: typeof objeto.url === "string" ? objeto.url : "",
        ...(idFragmento !== undefined ? { id_fragmento: idFragmento } : {}),
        ...(numeroFragmento !== undefined
          ? { numero_fragmento: numeroFragmento }
          : {}),
      },
    ];
  });
}

/**
 * Resuelve la respuesta del asistente para el último mensaje del usuario.
 *
 * `pregunta` es el texto recién enviado. El contexto se conserva para la
 * degradación local; `destinos` permite degradar a datos reales del catálogo
 * cuando el RAG no está disponible.
 */
export async function obtenerRespuestaAsistente({
  pregunta,
  contexto,
  destinos,
}: {
  pregunta: string;
  contexto: ContextoAsistente;
  destinos?: Atractivo[];
}): Promise<RespuestaAsistente> {
  try {
    const { data } = await api.post(ASISTENTE.endpoint, {
      pregunta,
      top_k: ASISTENTE.topK,
    });
    const texto = extraerTexto(data);

    if (texto) {
      return { texto, origen: "rag", citas: extraerCitas(data) };
    }
  } catch {
    // Una caída del RAG no rompe el chat: se informa la degradación.
  }

  const textoCatalogo = destinos?.length
    ? respuestaDesdeCatalogo(pregunta, destinos)
    : null;

  if (textoCatalogo) {
    return {
      texto: textoCatalogo,
      origen: "catalogo",
      citas: [],
      aviso: AVISO_CATALOGO,
    };
  }

  return {
    texto: responderAsistente(pregunta, contexto),
    origen: "local",
    citas: [],
    aviso: AVISO_LOCAL,
  };
}
