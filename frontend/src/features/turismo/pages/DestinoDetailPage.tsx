import { Link, useParams, useSearchParams } from "react-router-dom";
import { SiteFooter } from "../../../components/site/SiteFooter";
import { SiteHeader } from "../../../components/site/SiteHeader";
import { Icono } from "../../../components/site/Iconos";
import { Button, ButtonLink } from "../../../design-system/components/Button";
import { TurismoApiError } from "../api/turismoApi";
import { CatalogoError } from "../components/CatalogoError";
import { CategoriaBadge } from "../components/CategoriaBadge";
import { DetalleSkeleton } from "../components/Skeletons";
import { GaleriaDestino } from "../components/GaleriaDestino";
import { HorarioTabla } from "../components/HorarioTabla";
import { MapaDestino } from "../components/MapaDestino";
import { TarifaTabla } from "../components/TarifaTabla";
import { useRuta } from "../context/RutaContext";
import { useDestino } from "../hooks/useTurismo";
import {
  formatearCoordenadas,
  formatearDuracion,
  formatearUbicacion,
} from "../utils/formato";

function esRutaInternaSegura(valor: string | null): valor is string {
  return Boolean(valor?.startsWith("/") && !valor.startsWith("//"));
}

export function DestinoDetailPage() {
  const { id = "" } = useParams();
  const [parametros] = useSearchParams();
  const { contiene, alternar } = useRuta();
  const regresoSolicitado = parametros.get("volver");
  const regresoAlConstructor = esRutaInternaSegura(regresoSolicitado)
    ? regresoSolicitado
    : null;
  const parametrosCatalogo = new URLSearchParams(parametros);
  parametrosCatalogo.delete("volver");
  const queryCatalogo = parametrosCatalogo.toString();
  const volverA =
    regresoAlConstructor ??
    (queryCatalogo ? `/destinos?${queryCatalogo}` : "/destinos");
  const desdeConstructor = (() => {
    if (!regresoAlConstructor) return false;
    const [, query = ""] = regresoAlConstructor.split("?", 2);
    return (
      regresoAlConstructor.startsWith("/destinos") &&
      new URLSearchParams(query).get("vista") === "armar"
    );
  })();
  const etiquetaVolver = desdeConstructor
    ? "Volver a crear mi ruta"
    : "Volver al catálogo";
  const { data: destino, isPending, isError, error, refetch } = useDestino(id);

  if (isPending) {
    return (
      <div className="chuki-page min-h-screen bg-[var(--color-canvas)]">
        <SiteHeader />
        <main id="contenido-principal" className="contenedor-medio py-10">
          <Link to={volverA} className="inline-flex min-h-11 items-center gap-2 font-bold">
            <span aria-hidden="true">←</span> {etiquetaVolver}
          </Link>
          <div className="mt-8">
            <DetalleSkeleton />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (isError) {
    const noExiste = error instanceof TurismoApiError && error.esNoEncontrado;
    return (
      <div className="chuki-page min-h-screen bg-[var(--color-canvas)]">
        <SiteHeader />
        <main id="contenido-principal" className="grid min-h-[70vh] place-items-center px-5 py-16">
          <div className="max-w-lg text-center">
            {noExiste ? (
              <>
                <p className="font-data text-sm font-bold text-[var(--color-action)]">Error 404</p>
                <Icono nombre="brujula" className="mx-auto mt-6 h-12 w-12 text-[var(--color-brand)]" />
                <h1 className="mt-5 text-3xl font-black">No encontramos este destino</h1>
                <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
                  El lugar no existe o dejó de estar publicado. Regresa para
                  consultar otras opciones disponibles.
                </p>
                <ButtonLink to={volverA} variante="primary" className="mt-7">
                  {etiquetaVolver}
                </ButtonLink>
              </>
            ) : (
              <CatalogoError
                onReintentar={() => void refetch()}
                mensaje={
                  error instanceof Error
                    ? error.message
                    : "No pudimos cargar este destino."
                }
              />
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!destino) return null;

  const enRuta = contiene(destino.id);
  const duracion = formatearDuracion(destino.duracion_minutos);

  return (
    <div className="chuki-page min-h-screen bg-[var(--color-canvas)]">
      <SiteHeader />
      <main id="contenido-principal">
        <div className="contenedor-amplio py-5">
          <Link
            to={volverA}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--button-secondary-bg)] px-3 font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-route-strong)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)] motion-reduce:transition-none"
          >
            <span aria-hidden="true">←</span>
            {etiquetaVolver}
          </Link>
        </div>

        <section className="contenedor-amplio grid overflow-hidden bg-[var(--lp-night)] shadow-[var(--lp-shadow-float)] lg:min-h-[40rem] lg:grid-cols-[1.35fr_0.65fr]">
          <div className="min-h-[30rem] border-b border-white/10 lg:border-b-0">
            <GaleriaDestino atractivo={destino} />
          </div>
          <div className="lp-topographic flex flex-col justify-between p-6 text-white sm:p-8 lg:p-10 xl:p-12">
            <div>
              <div className="flex flex-wrap gap-2">
                {destino.categorias.map((categoria) => (
                  <CategoriaBadge key={categoria} categoria={categoria} />
                ))}
              </div>
              <h1 className="lp-editorial-title mt-6 text-[clamp(3.5rem,6vw,6.5rem)] leading-[0.82]">
                {destino.nombre}
              </h1>
              <p className="mt-6 flex items-start gap-2 leading-7 text-white/70">
                <Icono nombre="ubicacion" className="mt-1 h-5 w-5 shrink-0 text-[var(--lp-sun)]" />
                {formatearUbicacion(destino.direccion, destino.ubicacion)}
              </p>

              <dl className="mt-8 grid grid-cols-2 border-y border-white/20 sm:grid-cols-3">
                <Dato etiqueta="Visita" valor={duracion || "Sin confirmar"} />
                <Dato etiqueta="Tarifa" valor="Consultar abajo" />
                <Dato
                  etiqueta="Coordenadas"
                  valor={formatearCoordenadas(destino.ubicacion)}
                  className="col-span-2 sm:col-span-1"
                />
              </dl>
            </div>

            <div className="mt-8 grid gap-2 sm:grid-cols-[1fr_auto]">
              <Button
                variante={enRuta ? "route" : "primary"}
                onClick={() => alternar(destino)}
              >
                <Icono nombre="ruta" className="h-4 w-4" />
                {enRuta ? "Incluido en mi viaje" : "Añadir a mi viaje"}
              </Button>
              {enRuta && (
                <ButtonLink to="/destinos?vista=armar" variante="secondary">
                  Organizar
                </ButtonLink>
              )}
            </div>
          </div>
        </section>

        <div className="contenedor-amplio grid gap-10 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="space-y-8">
            <section
              aria-label="Descripción"
              className="border-l-4 border-[var(--color-action)] bg-[var(--color-surface)] p-7 shadow-[var(--lp-shadow-md)] sm:p-10"
            >
              <p className="text-sm font-bold text-[var(--color-action-hover)]">Antes de llegar</p>
              <h2 id="descripcion-destino" className="lp-editorial-title mt-3 text-5xl">
                Conoce el lugar
              </h2>
              <p className="mt-5 whitespace-pre-line leading-7 text-[var(--color-text-muted)]">
                {destino.descripcion ||
                  "La descripción de este destino todavía no está disponible."}
              </p>
            </section>

            <MapaDestino
              ubicacion={destino.ubicacion}
              nombreDestino={destino.nombre}
            />
          </div>

          <aside className="space-y-6" aria-label="Información para la visita">
            <HorarioTabla destinoId={destino.id} />
            <TarifaTabla destinoId={destino.id} />
            <section className="lp-panel p-5">
              <h2 className="font-black">Confianza de los datos</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-text-muted)]">Fuente</dt>
                  <dd className="text-right font-bold">{destino.fuente_origen}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-text-muted)]">Estado</dt>
                  <dd className="text-right font-bold text-[var(--color-brand)]">
                    Publicado
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  className = "",
}: {
  etiqueta: string;
  valor: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 py-4 pr-4 sm:border-r sm:border-white/20 sm:px-4 first:pl-0 last:border-r-0 ${className}`}>
      <dt className="text-xs text-white/55">{etiqueta}</dt>
      <dd className="mt-1 break-words font-data text-sm font-bold">{valor}</dd>
    </div>
  );
}
