/**
 * Adaptador del chat del asistente.
 *
 * Se consulta el endpoint RAG con la pregunta del usuario y se usa su
 * respuesta vectorizada. Si el servicio falla momentáneamente, se conserva
 * el motor local determinista como respaldo para no bloquear el chat.
 *
 * Contrato del endpoint RAG:
 *
 *   POST <VITE_ASISTENTE_CHAT_URL>
 *   { pregunta: string, top_k: number }
 *   → { respuesta: string, citas: [] }
 */

import { api } from "../../../api/http";
import { ASISTENTE } from "../../../config/recomendaciones";
import type { ContextoAsistente } from "../../../types/recomendaciones";
import { responderAsistente } from "../utils/asistente";

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

/**
 * Resuelve la respuesta del asistente para el último mensaje del usuario.
 *
 * `pregunta` es el texto recién enviado. El contexto se conserva para el
 * respaldo local si el RAG no está disponible.
 */
export async function obtenerRespuestaAsistente({
  pregunta,
  contexto,
}: {
  pregunta: string;
  contexto: ContextoAsistente;
}): Promise<string> {
  try {
    const { data } = await api.post(ASISTENTE.endpoint, {
      pregunta,
      top_k: ASISTENTE.topK,
    });
    const texto = extraerTexto(data);

    if (texto) {
      return texto;
    }
  } catch {
    // El motor local mantiene el chat operativo si el RAG falla
    // momentáneamente.
  }

  return responderAsistente(pregunta, contexto);
}
