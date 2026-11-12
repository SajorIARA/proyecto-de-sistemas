/**
 * Ventana de chat con el asistente de viaje.
 *
 * Mientras el backend no publique un endpoint de RAG (issue #28), las
 * respuestas salen del motor local (`utils/asistente.ts`) con el contexto
 * real de la pantalla: Top-K, perfil y estimación de traslados. La interfaz
 * ya soporta el contrato futuro porque `api/asistenteApi.ts` puede apuntar a
 * `VITE_ASISTENTE_CHAT_URL`.
 *
 * Las respuestas se revelan por lotes para dar sensación de escritura. El
 * contenedor es un `role="log"` con `aria-live="polite"`, y el estado de
 * carga se anuncia como `role="status"`.
 */

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Icono } from "../../../components/site/Iconos";
import { ASISTENTE } from "../../../config/recomendaciones";
import type {
  MensajeAsistente,
  PerfilBusqueda,
  Recomendacion,
} from "../../../types/recomendaciones";
import { obtenerRespuestaAsistente } from "../api/asistenteApi";

const BIENVENIDA =
  "Hola, soy tu asistente de viaje. Puedo comparar tus recomendaciones por afinidad, costo total y cercanía. Preguntame qué querés hacer en La Paz.";

const SUGERENCIAS = [
  "¿Cuál es la mejor opción?",
  "¿Cuánto gastaré en total?",
  "¿Qué está más cerca?",
  "¿Cómo llego al destino?",
] as const;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

interface AsistenteChatProps {
  recomendaciones: Recomendacion[];
  perfil: PerfilBusqueda;
}

export function AsistenteChat({
  recomendaciones,
  perfil,
}: AsistenteChatProps) {
  const idBase = useId();
  const idEntrada = `${idBase}-pregunta`;
  const contador = useRef(0);
  const registroRef = useRef<HTMLDivElement>(null);

  const [mensajes, setMensajes] = useState<MensajeAsistente[]>(() => [
    {
      id: "bienvenida",
      rol: "asistente",
      texto: BIENVENIDA,
    },
  ]);
  const [revelados, setRevelados] = useState<Record<string, number>>({});
  const [pregunta, setPregunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function nuevoId(prefijo: string): string {
    contador.current += 1;

    return `${prefijo}-${contador.current}`;
  }

  // Revelado progresivo del último mensaje del asistente.
  useEffect(() => {
    const pendiente = mensajes.find(
      (mensaje) => mensaje.rol === "asistente" && mensaje.escribiendo,
    );

    if (!pendiente) {
      return;
    }

    const visible = revelados[pendiente.id] ?? 0;

    if (visible >= pendiente.texto.length) {
      setMensajes((previos) =>
        previos.map((mensaje) =>
          mensaje.id === pendiente.id
            ? { ...mensaje, escribiendo: false }
            : mensaje,
        ),
      );
      return;
    }

    const temporizador = window.setTimeout(() => {
      setRevelados((previos) => ({
        ...previos,
        [pendiente.id]: Math.min(
          pendiente.texto.length,
          (previos[pendiente.id] ?? 0) + ASISTENTE.caracteresPorPaso,
        ),
      }));
    }, ASISTENTE.velocidadReveladoMs);

    return () => window.clearTimeout(temporizador);
  }, [mensajes, revelados]);

  // Mantiene la conversación anclada al último mensaje.
  useEffect(() => {
    const registro = registroRef.current;

    if (registro) {
      registro.scrollTop = registro.scrollHeight;
    }
  }, [mensajes, revelados, enviando]);

  async function responder(texto: string) {
    const limpio = texto.trim();

    if (limpio === "" || enviando) {
      return;
    }

    setError(null);
    setEnviando(true);
    setPregunta("");

    const historial = mensajes;
    const mensajeUsuario: MensajeAsistente = {
      id: nuevoId("usuario"),
      rol: "usuario",
      texto: limpio,
    };

    setMensajes([...historial, mensajeUsuario]);

    try {
      const [respuesta] = await Promise.all([
        obtenerRespuestaAsistente({
          pregunta: limpio,
          mensajes: historial,
          contexto: { recomendaciones, perfil },
        }),
        esperar(ASISTENTE.pausaPensandoMs),
      ]);

      const id = nuevoId("asistente");

      setRevelados((previos) => ({ ...previos, [id]: 0 }));
      setMensajes((previos) => [
        ...previos,
        { id, rol: "asistente", texto: respuesta, escribiendo: true },
      ]);
    } catch {
      setError(
        "No pude responder en este momento. Revisá tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void responder(pregunta);
  }

  function textoVisible(mensaje: MensajeAsistente): string {
    if (mensaje.rol === "asistente" && mensaje.escribiendo) {
      return mensaje.texto.slice(0, revelados[mensaje.id] ?? 0);
    }

    return mensaje.texto;
  }

  return (
    <section
      aria-labelledby="titulo-asistente"
      data-testid="asistente-chat"
      className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#5B3A29]/[0.1] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.1)]"
    >
      <header className="flex items-start gap-3 border-b border-[#EEE5D8] bg-[#233128] px-5 py-4 text-[#F3EBDD]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E9DFC9]/25 bg-[#F5EFE4]/10 text-[#E8C16A]">
          <Icono nombre="chat" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            id="titulo-asistente"
            className="text-base font-black tracking-tight text-[#FFFDF8]"
          >
            Asistente de viaje
          </h2>
          <p className="mt-0.5 text-[0.65rem] leading-5 text-[#F5EFE4]/65">
            {recomendaciones.length > 0
              ? `Contexto: ${recomendaciones.length} ${
                  recomendaciones.length === 1 ? "destino" : "destinos"
                } de tu Top-K`
              : "Todavía sin ranking calculado"}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#8FB37F] shadow-[0_0_0_4px_rgba(143,179,127,0.16)]"
        />
      </header>

      <div
        ref={registroRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversación con el asistente"
        aria-busy={enviando}
        data-testid="asistente-registro"
        className="min-h-[280px] flex-1 space-y-4 overflow-y-auto bg-[#FBF6EC]/60 px-4 py-5 sm:px-5"
      >
        {mensajes.map((mensaje) => {
          const esUsuario = mensaje.rol === "usuario";

          return (
            <article
              key={mensaje.id}
              className={`flex gap-2.5 ${esUsuario ? "justify-end" : "justify-start"}`}
            >
              {!esUsuario && (
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7EFE7] text-[#2F4B3B]"
                >
                  <Icono nombre="montana" className="h-4 w-4" />
                </span>
              )}

              <div
                className={[
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                  esUsuario
                    ? "rounded-br-sm bg-[#2F4B3B] text-[#FFFDF8]"
                    : "rounded-bl-sm border border-[#5B3A29]/[0.08] bg-[#FFFDF8] text-[#3C3A35]",
                ].join(" ")}
              >
                <p className="sr-only">
                  {esUsuario ? "Tú dijiste:" : "El asistente responde:"}
                </p>
                <p className="whitespace-pre-line break-words">
                  {textoVisible(mensaje)}
                  {mensaje.rol === "asistente" && mensaje.escribiendo && (
                    <span
                      aria-hidden="true"
                      className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-[#8D4F32] align-middle"
                    />
                  )}
                </p>
              </div>
            </article>
          );
        })}

        {enviando && (
          <p
            role="status"
            className="flex items-center gap-2.5 text-xs font-bold text-[#746D63]"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E7EFE7] text-[#2F4B3B]"
            >
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6F8064] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6F8064] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6F8064]" />
              </span>
            </span>
            Pensando…
          </p>
        )}
      </div>

      <div className="border-t border-[#EEE5D8] bg-[#FFFDF8] px-4 py-4 sm:px-5">
        <div
          className="flex flex-wrap gap-2"
          aria-label="Preguntas sugeridas"
        >
          {SUGERENCIAS.map((sugerencia) => (
            <button
              key={sugerencia}
              type="button"
              disabled={enviando}
              onClick={() => void responder(sugerencia)}
              className="rounded-full border border-[#5B3A29]/15 bg-[#F7F1E6] px-3 py-1.5 text-[0.68rem] font-bold text-[#6F655B] transition hover:border-[#9A5B3C]/45 hover:text-[#8D4F32] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {sugerencia}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-[#9A5B3C]/25 bg-[#9A5B3C]/[0.06] px-3 py-2 text-xs font-semibold text-[#8D4F32]"
          >
            {error}
          </p>
        )}

        <form onSubmit={manejarEnvio} className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={idEntrada} className="sr-only">
              Escribe tu pregunta para el asistente
            </label>

            <textarea
              id={idEntrada}
              rows={2}
              value={pregunta}
              disabled={enviando}
              onChange={(evento) => setPregunta(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" && !evento.shiftKey) {
                  evento.preventDefault();
                  void responder(pregunta);
                }
              }}
              placeholder="Pregunta por costos, tiempos o traslados…"
              className="w-full resize-none rounded-2xl border border-[#5B3A29]/15 bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#233128] placeholder:text-[#9C9286] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A5B3C] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={enviando || pregunta.trim() === ""}
            aria-label="Enviar pregunta"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#9A5B3C] text-[#FFFDF8] transition hover:bg-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A5B3C] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Icono nombre="enviar" className="h-5 w-5" />
          </button>
        </form>

        <p className="mt-3 text-[0.62rem] leading-5 text-[#91877B]">
          Respuestas basadas en tu perfil y tu Top-K. Los costos de traslado
          son estimaciones referenciales en bolivianos.
        </p>
      </div>
    </section>
  );
}
