/**
 * Adaptador del chat del asistente.
 *
 * Si existe `VITE_ASISTENTE_CHAT_URL`, se envía la conversación al endpoint
 * del RAG (`{ mensajes, contexto }`) y se usa su respuesta. Mientras el
 * backend no lo exponga —o si el endpoint falla— se responde con el motor
 * local determinista, de modo que el chat nunca queda bloqueado.
 *
 * Contrato esperado del endpoint futuro:
 *
 *   POST <VITE_ASISTENTE_CHAT_URL>
 *   { mensajes: [{ rol, texto }], contexto: { recomendaciones, perfil } }
 *   → { respuesta: string } | { texto: string } | { message: string }
 */

import { api } from "../../../api/http";
import { ASISTENTE } from "../../../config/recomendaciones";
import type {
  ContextoAsistente,
  MensajeAsistente,
} from "../../../types/recomendaciones";
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
 * `mensajes` incluye todo el historial (sin el mensaje que se está
 * respondiendo en la UI) y `pregunta` es el texto recién enviado.
 */
export async function obtenerRespuestaAsistente({
  pregunta,
  mensajes,
  contexto,
}: {
  pregunta: string;
  mensajes: MensajeAsistente[];
  contexto: ContextoAsistente;
}): Promise<string> {
  if (ASISTENTE.endpoint) {
    try {
      const { data } = await api.post(ASISTENTE.endpoint, {
        mensajes: mensajes.map(({ rol, texto }) => ({ rol, texto })),
        contexto,
      });
      const texto = extraerTexto(data);

      if (texto) {
        return texto;
      }
    } catch {
      // El motor local mantiene el chat operativo si el endpoint aún no
      // está desplegado o falla momentáneamente.
    }
  }

  return responderAsistente(pregunta, contexto);
}
