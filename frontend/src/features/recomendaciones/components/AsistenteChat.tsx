/**
 * Ventana de chat con el asistente de viaje.
 *
 * El adaptador (`api/asistenteApi.ts`) consulta primero el RAG y, si no está
 * disponible, degrada a datos del catálogo o al motor local. Cada respuesta
 * muestra su procedencia, el aviso de degradación y las citas documentales
 * cuando existen, para no simular una respuesta verificada.
 *
 * Las respuestas se revelan por lotes para dar sensación de escritura; las
 * citas aparecen recién cuando el texto terminó. El contenedor es un
 * `role="log"` con `aria-live="polite"`, y el estado de carga se anuncia como
 * `role="status"`.
 */

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Icono } from "../../../components/site/Iconos";
import { ASISTENTE } from "../../../config/recomendaciones";
import type {
  MensajeAsistente,
  OrigenRespuesta,
  PerfilBusqueda,
  Recomendacion,
} from "../../../types/recomendaciones";
import { obtenerRespuestaAsistente } from "../api/asistenteApi";

const ETIQUETA_ORIGEN: Record<OrigenRespuesta, string> = {
  rag: "Fuente: documentación verificada",
  catalogo: "Fuente: catálogo",
  local: "Respuesta estimada",
};

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

/** Procedencia, avisos y citas: solo se muestran cuando el texto terminó. */
function DetallesRespuesta({ mensaje }: { mensaje: MensajeAsistente }) {
  if (mensaje.escribiendo || !mensaje.origen) {
    return null;
  }

  const citas = mensaje.citas ?? [];

  return (
    <div className="mt-2 space-y-2 border-t border-[var(--color-border)] pt-2">
      <span
        className={[
          "inline-flex rounded-full px-2 py-0.5 text-[0.62rem] font-black tracking-wide",
          mensaje.origen === "local"
            ? "bg-[var(--color-surface-muted)] text-[var(--color-brand)]"
            : "bg-[var(--color-surface-muted)] text-[var(--color-brand)]",
        ].join(" ")}
      >
        {ETIQUETA_ORIGEN[mensaje.origen]}
      </span>

      {mensaje.aviso && (
        <p className="rounded-lg border border-[var(--color-action)] bg-[var(--color-surface-muted)] px-2 py-1 text-[0.65rem] font-semibold leading-4 text-[var(--color-brand)]">
          Aviso: {mensaje.aviso}
        </p>
      )}

      {citas.length > 0 && (
        <ul
          aria-label="Fuentes de la respuesta"
          className="space-y-1 text-[0.65rem] leading-4 text-[var(--color-text-muted)]"
        >
          {citas.map((cita, indice) => (
            <li key={cita.id_fragmento ?? `${cita.titulo}-${indice}`}>
              {cita.url ? (
                <a
                  href={cita.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--color-brand)] underline decoration-[var(--color-brand)] underline-offset-2 hover:decoration-[var(--color-brand)]"
                >
                  {cita.titulo}
                </a>
              ) : (
                <span className="font-bold">{cita.titulo}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
          contexto: { recomendaciones, perfil },
        }),
        esperar(ASISTENTE.pausaPensandoMs),
      ]);

      const id = nuevoId("asistente");

      setRevelados((previos) => ({ ...previos, [id]: 0 }));
      setMensajes((previos) => [
        ...previos,
        {
          id,
          rol: "asistente",
          texto: respuesta.texto,
          escribiendo: true,
          origen: respuesta.origen,
          citas: respuesta.citas,
          aviso: respuesta.aviso,
        },
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
      className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-border)]/[0.1] bg-[var(--color-surface)] shadow-[0_20px_60px_rgba(72,55,38,0.1)]"
    >
      <header className="flex items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-[var(--color-text)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-action)]">
          <Icono nombre="chat" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            id="titulo-asistente"
            className="text-base font-black tracking-tight text-[var(--color-text)]"
          >
            Asistente de viaje
          </h2>
          <p className="mt-0.5 text-[0.65rem] leading-5 text-[var(--color-text)]">
            {recomendaciones.length > 0
              ? `Contexto: ${recomendaciones.length} ${
                  recomendaciones.length === 1 ? "destino" : "destinos"
                } de tu Top-K`
              : "Todavía sin ranking calculado"}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-success)] shadow-[0_0_0_4px_rgba(143,179,127,0.16)]"
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
        className="min-h-[280px] flex-1 space-y-4 overflow-y-auto bg-[var(--color-surface-muted)] px-4 py-5 sm:px-5"
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
                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-brand)]"
                >
                  <Icono nombre="montana" className="h-4 w-4" />
                </span>
              )}

              <div
                className={[
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                  esUsuario
                    ? "rounded-br-sm bg-[var(--color-route-strong)] text-[var(--color-text)]"
                    : "rounded-bl-sm border border-[var(--color-border)]/[0.08] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
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
                      className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-[var(--color-action)] align-middle"
                    />
                  )}
                </p>
                {mensaje.rol === "asistente" && (
                  <DetallesRespuesta mensaje={mensaje} />
                )}
              </div>
            </article>
          );
        })}

        {enviando && (
          <p
            role="status"
            className="flex items-center gap-2.5 text-xs font-bold text-[var(--color-text-muted)]"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-brand)]"
            >
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-surface-muted)] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-surface-muted)] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-surface-muted)]" />
              </span>
            </span>
            Pensando…
          </p>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-5">
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
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-[0.68rem] font-bold text-[var(--color-text-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {sugerencia}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-[var(--color-brand)] bg-[var(--color-action)]/[0.06] px-3 py-2 text-xs font-semibold text-[var(--color-brand)]"
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
              className="w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={enviando || pregunta.trim() === ""}
            aria-label="Enviar pregunta"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-action)] text-[var(--lp-night)] transition hover:bg-[var(--color-action)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Icono nombre="enviar" className="h-5 w-5" />
          </button>
        </form>

        <p className="mt-3 text-[0.62rem] leading-5 text-[var(--color-text-muted)]">
          Cada respuesta indica su fuente: documentación verificada, catálogo o
          estimaciones locales. Los costos de traslado son referenciales en
          bolivianos.
        </p>
      </div>
    </section>
  );
}
