import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "../../../components/site/SiteHeader";
import { SiteFooter } from "../../../components/site/SiteFooter";
import { Icono } from "../../../components/site/Iconos";
import { Button, ButtonLink } from "../../../design-system/components/Button";
import { useRuta } from "../context/RutaContext";
import { formatearDuracion, formatearUbicacion } from "../utils/formato";

const ETIQUETA_ESTADO = {
  planificado: "Planificado",
  en_curso: "En curso",
  finalizado: "Finalizado",
} as const;

export function RutaPage() {
  const {
    destinos,
    quitar,
    rutas,
    rutaActivaId,
    crearRuta,
    seleccionarRuta,
    iniciarViaje,
    finalizarViaje,
    marcarVisitada,
    eliminarRuta,
    guardando,
    errorRuta,
  } = useRuta();
  const navigate = useNavigate();
  const rutasGuardadas = rutas.filter((ruta) => ruta.guardada);
  const activa = rutas.find((ruta) => ruta.id === rutaActivaId) ?? rutas[0];
  const persistida = Boolean(activa?.guardada && !activa.id.startsWith("ruta-"));
  const duracionTotal = destinos.reduce(
    (total, destino) => total + (destino.duracion_minutos ?? 0),
    0,
  );
  const visitadas = activa?.paradasBackend.filter((parada) => parada.visitada).length ?? 0;

  return (
    <div className="chuki-page min-h-screen bg-[var(--color-canvas)]">
      <SiteHeader />
      <main id="contenido-principal">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="contenedor-medio flex flex-col justify-between gap-7 py-10 sm:flex-row sm:items-end sm:py-14">
            <div>
              <p className="text-sm font-bold text-[var(--color-brand)]">Tus viajes guardados</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                Mis viajes
              </h1>
              <p className="mt-4 max-w-xl leading-7 text-[var(--color-text-muted)]">
                Revisa tus paradas, sigue el recorrido y marca las visitas ya
                realizadas. Los viajes guardados con tu cuenta se conservan
                entre sesiones.
              </p>
            </div>
            <Button
              variante="primary"
              onClick={() => {
                crearRuta();
                navigate("/destinos?vista=armar");
              }}
            >
              + Crear otro viaje
            </Button>
          </div>
        </header>

        <section className="contenedor-medio py-8" aria-label="Rutas guardadas">
          {errorRuta && (
            <p role="alert" className="mb-5 border-l-4 border-[var(--color-danger)] bg-[var(--color-surface)] p-4 text-sm font-bold text-[var(--color-danger)]">
              {errorRuta}
            </p>
          )}
          {rutasGuardadas.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {rutasGuardadas.map((ruta) => {
                const activaBoton = ruta.id === rutaActivaId;
                return (
                  <button
                    key={ruta.id}
                    type="button"
                    onClick={() => seleccionarRuta(ruta.id)}
                    aria-pressed={activaBoton}
                    className={`lp-button min-h-12 min-w-48 shrink-0 px-4 text-left ${
                      activaBoton ? "lp-button--route" : "lp-button--secondary"
                    }`}
                  >
                    <span className="block font-bold">{ruta.nombre}</span>
                    <span className="mt-1 block font-data text-xs">
                      {ruta.destinos.length}{" "}
                      {ruta.destinos.length === 1 ? "destino" : "destinos"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="contenedor-medio pb-16" aria-label="Destinos del viaje">
          {destinos.length === 0 ? (
            <div className="lp-panel px-6 py-16 text-center">
              <Icono nombre="ruta" className="mx-auto h-11 w-11 text-[var(--color-route)]" />
              <h2 className="mt-6 text-2xl font-black">Tu ruta aún está vacía</h2>
              <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--color-text-muted)]">
                Explora el catálogo y añade únicamente los lugares que realmente
                quieres comparar y organizar.
              </p>
              <ButtonLink to="/destinos" variante="primary" className="mt-7">
                Explorar destinos
              </ButtonLink>
            </div>
          ) : (
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-black">Paradas seleccionadas</h2>
                  {duracionTotal > 0 && (
                    <p className="font-data text-sm font-bold text-[var(--color-brand)]">
                      {formatearDuracion(duracionTotal)} de visitas
                    </p>
                  )}
                </div>
                <ol className="border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {destinos.map((destino, indice) => {
                    const parada = activa?.paradasBackend.find(
                      (item) => item.atractivo === destino.id,
                    );
                    return (
                      <li
                        key={destino.id}
                        className="grid gap-4 border-b border-[var(--color-border)] p-5 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-route)] font-data font-bold text-[var(--lp-night)]">
                          {indice + 1}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-black">
                            <Link to={`/destinos/${destino.id}`} className="hover:text-[var(--color-brand)]">
                              {destino.nombre}
                            </Link>
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                            {formatearUbicacion(destino.direccion, destino.ubicacion)}
                          </p>
                          {parada && (
                            <p className="mt-1 text-xs font-bold text-[var(--color-brand)]">
                              {parada.visitada ? "✓ Visitada" : "Pendiente de visita"}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => quitar(destino.id)}
                            className="min-h-11 text-sm font-bold text-[var(--color-danger)]"
                          >
                            Quitar
                          </button>
                          {persistida && parada && (
                            <button
                              type="button"
                              disabled={parada.visitada}
                              onClick={() => void marcarVisitada(parada.id, true)}
                              className="min-h-11 text-sm font-bold text-[var(--color-brand)] underline disabled:opacity-50"
                            >
                              {parada.visitada ? "Ya visitada" : "Marcar visitada"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <aside className="lp-panel p-5 lg:sticky lg:top-24 lg:self-start">
                <h2 className="font-black">Estado del viaje</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  {persistida
                    ? `Guardado en tu cuenta · ${ETIQUETA_ESTADO[activa.estado]} · ${visitadas}/${destinos.length} visitas registradas.`
                    : "Este borrador vive solo en este navegador. Inicia sesión y termina el plan para guardarlo en tu cuenta."}
                </p>
                <ButtonLink
                  to="/destinos?vista=armar"
                  variante="route"
                  className="mt-5 w-full"
                >
                  Organizar recorrido
                </ButtonLink>
                {persistida && (
                  <div className="mt-3 space-y-2">
                    {activa.estado === "planificado" && (
                      <Button
                        variante="primary"
                        className="w-full"
                        disabled={guardando}
                        onClick={() => void iniciarViaje()}
                      >
                        Iniciar seguimiento
                      </Button>
                    )}
                    {activa.estado === "en_curso" && (
                      <Button
                        variante="primary"
                        className="w-full"
                        disabled={guardando}
                        onClick={() => void finalizarViaje()}
                      >
                        Finalizar viaje
                      </Button>
                    )}
                    <Button
                      variante="quiet"
                      className="w-full"
                      onClick={() => void eliminarRuta(activa.id)}
                    >
                      Eliminar viaje guardado
                    </Button>
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
