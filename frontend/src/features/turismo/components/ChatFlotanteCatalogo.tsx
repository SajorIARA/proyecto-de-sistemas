import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Icono } from "../../../components/site/Iconos";
import { obtenerRespuestaAsistente } from "../../recomendaciones/api/asistenteApi";
import type {
  MensajeAsistente,
  OrigenRespuesta,
  PerfilBusqueda,
} from "../../../types/recomendaciones";
import type { Atractivo } from "../../../types/turismo";

/**
 * Asistente disponible desde el catálogo. Reutiliza el adaptador RAG y pasa
 * los destinos cargados para que la degradación use datos reales. La UI
 * rotula cada respuesta con su procedencia y avisa cuando no hubo RAG.
 */

const ETIQUETA_ORIGEN: Record<OrigenRespuesta, string> = {
  rag: "Fuente: documentación verificada",
  catalogo: "Fuente: catálogo",
  local: "Respuesta estimada",
};

const PERFIL_CATALOGO: PerfilBusqueda = {
  presupuestoBob: 500,
  duracionValor: 4,
  duracionUnidad: "horas",
  macrodistrito: "Centro",
  latitud: -16.495,
  longitud: -68.134,
  radioKm: 15,
  topK: 8,
};

const BIENVENIDA: MensajeAsistente = {
  id: "bienvenida",
  rol: "asistente",
  texto:
    "¡Kamisaraki! Puedo orientarte sobre destinos, horarios, tarifas y cómo explorar La Paz.",
};

function DetallesRespuesta({ mensaje }: { mensaje: MensajeAsistente }) {
  if (!mensaje.origen) {
    return null;
  }

  const citas = mensaje.citas ?? [];

  return (
    <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
      <span
        className={[
          "inline-flex rounded-full px-2 py-0.5 text-[0.62rem] font-black tracking-wide",
          mensaje.origen === "local"
            ? "bg-[var(--color-action)]/15 text-[var(--color-action)]"
            : "bg-[var(--color-brand)]/15 text-[var(--color-brand)]",
        ].join(" ")}
      >
        {ETIQUETA_ORIGEN[mensaje.origen]}
      </span>

      {mensaje.aviso && (
        <p className="text-[0.68rem] font-semibold leading-4 text-[var(--color-action)]">
          Aviso: {mensaje.aviso}
        </p>
      )}

      {citas.length > 0 && (
        <ul
          aria-label="Fuentes de la respuesta"
          className="space-y-0.5 text-[0.68rem] leading-4 text-[var(--color-text-muted)]"
        >
          {citas.map((cita, indice) => (
            <li key={cita.id_fragmento ?? `${cita.titulo}-${indice}`}>
              {cita.url ? (
                <a
                  href={cita.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--color-brand)] underline underline-offset-2"
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

export function ChatFlotanteCatalogo({
  destinos = [],
}: {
  destinos?: Atractivo[];
}) {
  const panelId = useId();
  const [abierto, setAbierto] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState<MensajeAsistente[]>([BIENVENIDA]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registroRef = useRef<HTMLDivElement>(null);
  const contador = useRef(0);

  useEffect(() => {
    const registro = registroRef.current;
    if (registro) registro.scrollTop = registro.scrollHeight;
  }, [mensajes, enviando]);

  function siguienteId(prefijo: string) {
    contador.current += 1;
    return `${prefijo}-${contador.current}`;
  }

  async function responder(texto: string) {
    const limpio = texto.trim();
    if (!limpio || enviando) return;

    setError(null);
    setPregunta("");
    setEnviando(true);
    setMensajes((actuales) => [
      ...actuales,
      { id: siguienteId("usuario"), rol: "usuario", texto: limpio },
    ]);

    try {
      const respuesta = await obtenerRespuestaAsistente({
        pregunta: limpio,
        contexto: { recomendaciones: [], perfil: PERFIL_CATALOGO },
        destinos,
      });

      setMensajes((actuales) => [
        ...actuales,
        {
          id: siguienteId("asistente"),
          rol: "asistente",
          texto: respuesta.texto,
          origen: respuesta.origen,
          citas: respuesta.citas,
          aviso: respuesta.aviso,
        },
      ]);
    } catch {
      setError(
        "No pude responder en este momento. Revisa tu conexión e inténtalo nuevamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void responder(pregunta);
  }

  return (
    <aside
      aria-label="Asistente de viaje"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-50 w-[min(23rem,calc(100vw-2rem))] sm:right-5"
    >
      {abierto && (
        <section
          id={panelId}
          role="dialog"
          aria-labelledby={`${panelId}-titulo`}
          className="mb-3 overflow-hidden rounded-[1.5rem] border border-[var(--color-brand)]/35 bg-[var(--color-surface-muted)] text-[var(--color-text)] shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
        >
          <header className="flex items-center justify-between bg-[var(--lp-night)] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Icono nombre="chat" className="h-5 w-5 text-[var(--color-action)]" />
              <div>
                <h2 id={`${panelId}-titulo`} className="text-sm font-black">Asistente La Paz</h2>
                <p className="text-[0.7rem] text-white/75">Destinos, horarios y rutas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
              className="grid h-11 w-11 place-items-center rounded-full text-xl text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)] motion-reduce:transition-none"
            >
              ×
            </button>
          </header>

          <div
            ref={registroRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={enviando}
            className="max-h-72 space-y-3 overflow-y-auto bg-[var(--color-canvas)] p-4 text-sm leading-6 text-[var(--color-text)]"
          >
            {mensajes.map((mensaje) => (
              <div
                key={mensaje.id}
                className={
                  mensaje.rol === "usuario"
                    ? "ml-8 rounded-2xl rounded-br-sm bg-[var(--color-route-strong)] p-3 text-[var(--color-text)]"
                    : "mr-5 rounded-2xl rounded-tl-sm border border-[var(--color-brand)]/20 bg-[var(--button-secondary-bg)] p-3 text-[var(--color-text)] shadow-sm"
                }
              >
                <p>{mensaje.texto}</p>
                {mensaje.rol === "asistente" && (
                  <DetallesRespuesta mensaje={mensaje} />
                )}
              </div>
            ))}
            {enviando && (
              <p role="status" className="rounded-2xl rounded-tl-sm bg-[var(--button-secondary-bg)] p-3 text-xs font-bold text-white shadow-sm">
                Buscando una respuesta…
              </p>
            )}
          </div>

          <form onSubmit={enviar} className="border-t border-[var(--color-brand)]/20 bg-[var(--color-surface-muted)] p-3">
            {error && <p role="alert" className="mb-2 text-xs font-semibold text-[var(--color-action)]">{error}</p>}
            <div className="flex gap-2">
              <input
                value={pregunta}
                disabled={enviando}
                onChange={(evento) => setPregunta(evento.target.value)}
                placeholder="Pregunta sobre La Paz…"
                aria-label="Pregunta para el asistente"
                className="min-w-0 min-h-11 flex-1 rounded-xl border border-[var(--color-brand)]/45 bg-[var(--color-canvas)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-action)] focus:ring-2 focus:ring-[var(--color-action)]/30 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={enviando || !pregunta.trim()}
                className="min-h-11 rounded-xl bg-[var(--color-action)] px-3 text-sm font-black text-[var(--lp-night)] transition-colors hover:bg-[var(--color-action)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              >
                {enviando ? "…" : "Enviar"}
              </button>
            </div>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-controls={panelId}
        className="ml-auto flex min-h-12 items-center gap-2 rounded-full border border-[var(--color-brand)]/40 bg-[var(--lp-night)] px-5 py-3 text-sm font-black text-[var(--color-text)] shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-route-strong)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)] motion-reduce:transition-none"
      >
        <Icono nombre="chat" className="h-4 w-4 text-[var(--color-action)]" />
        {abierto ? "Cerrar asistente" : "Pregunta a La Paz"}
      </button>
    </aside>
  );
}
