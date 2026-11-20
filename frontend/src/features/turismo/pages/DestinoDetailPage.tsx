/**
 * Vista individual de un destino — ruta `/destinos/:id`.
 *
 * Se compone como la ficha de campo que cierra el catálogo: una barra
 * mínima de navegación, una portada oscura con los datos de archivo, la
 * galería, la descripción, el mapa y los paneles prácticos de horario y
 * tarifas. Conserva la lógica original: carga por id, galería preparada
 * para Cloudinary, horarios y tarifas filtrados en cliente, retorno al
 * catálogo con los filtros activos y 404 propio.
 */

import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { TurismoApiError } from "../api/turismoApi";
import { useDestino } from "../hooks/useTurismo";
import { formatearDuracion, formatearCoordenadas } from "../utils/formato";
import { CatalogoError } from "../components/CatalogoError";
import { CategoriaBadge } from "../components/CategoriaBadge";
import { DetalleSkeleton } from "../components/Skeletons";
import { GaleriaDestino } from "../components/GaleriaDestino";
import { HorarioTabla } from "../components/HorarioTabla";
import { MapaDestino } from "../components/MapaDestino";
import { TarifaTabla } from "../components/TarifaTabla";
import { EncabezadoImagen } from "../../../components/EncabezadoImagen";
import { Icono, type NombreIcono } from "../../../components/site/Iconos";
import { SiteFooter } from "../../../components/site/SiteFooter";

export function DestinoDetailPage() {
  const { id = "" } = useParams();
  const [parametros] = useSearchParams();

  // Conserva la combinación de filtros activa al volver al catálogo
  // (categoría, texto, zona y rango de precio).
  const query = parametros.toString();
  const volverA = query ? `/destinos?${query}` : "/destinos";

  const { data: destino, isPending, isError, error, refetch } = useDestino(id);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#F3EBDD] text-[#263029]">
        <BarraFicha volverA={volverA} />

        <main className="px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="contenedor-medio">
            <Link
              to={volverA}
              className="inline-flex items-center gap-2.5 border-b border-[#233128]/25 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32]"
            >
              <span aria-hidden="true">←</span> Volver al catálogo
            </Link>

            <div className="mt-10">
              <DetalleSkeleton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    const noExiste = error instanceof TurismoApiError && error.esNoEncontrado;

    return (
      <div className="flex min-h-screen flex-col bg-[#F3EBDD] text-[#263029]">
        <BarraFicha volverA={volverA} />

        <main className="grid flex-1 place-items-center px-6 py-16 sm:px-8">
          <div className="w-full max-w-xl">
            {noExiste ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#9A5B3C]">
                  Error 404
                </p>

                <p
                  className="font-display mt-4 text-[clamp(5rem,14vw,9rem)] font-black leading-none tracking-[-0.06em] text-[#233128]/15"
                  aria-hidden="true"
                >
                  404
                </p>

                <h1 className="font-display mt-2 text-[clamp(2rem,4vw,3rem)] font-black leading-[0.98] tracking-[-0.045em] text-[#233128]">
                  No encontramos este destino
                </h1>

                <p className="mt-5 max-w-md text-sm leading-7 text-[#514B43]">
                  El atractivo que buscas no existe o ya no está disponible en
                  nuestro catálogo. Puede que haya cambiado su nombre o que se
                  haya dado de baja.
                </p>

                <Link
                  to={volverA}
                  className="group mt-8 inline-flex items-center justify-between gap-10 bg-[#233128] px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8] transition hover:bg-[#2F4B3B]"
                >
                  Volver al catálogo
                  <span
                    className="font-display text-base transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </>
            ) : (
              <CatalogoError
                onReintentar={() => void refetch()}
                mensaje={
                  error instanceof Error
                    ? error.message
                    : "No pudimos cargar la información de este destino."
                }
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!destino) {
    return null;
  }

  const duracion = formatearDuracion(destino.duracion_minutos);

  return (
    <div className="min-h-screen bg-[#F3EBDD] text-[#263029]">
      <BarraFicha volverA={volverA} />

      <main>
        {/* =========================================================
            PORTADA DE LA FICHA
        ========================================================== */}
        <header className="relative overflow-hidden border-b border-[#5B3A29]/15 bg-[#233128]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage: `
                linear-gradient(45deg, rgba(233,223,201,.55) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(233,223,201,.55) 25%, transparent 25%)
              `,
              backgroundSize: "52px 52px",
            }}
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute -left-24 top-0 h-80 w-80 bg-[#C6923B]/15 blur-[120px]"
            aria-hidden="true"
          />

          <div className="contenedor-medio relative px-6 pb-10 pt-7 sm:px-8 lg:px-10 lg:pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F3EBDD]/15 pb-5">
              <Link
                to={volverA}
                className="inline-flex items-center gap-2.5 border border-[#F3EBDD]/25 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F3EBDD] transition hover:border-[#E8C16A] hover:text-[#E8C16A]"
              >
                <span aria-hidden="true">←</span>
                Volver al catálogo
              </Link>

              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#F3EBDD]/55">
                Archivo de la ciudad{" "}
                <span className="text-[#E8C16A]">/</span> La Paz · Bolivia
              </p>
            </div>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-end">
              <div>
                {destino.categorias.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {destino.categorias.map((categoria) => (
                      <CategoriaBadge key={categoria} categoria={categoria} />
                    ))}
                  </div>
                )}

                <h1 className="font-display mt-5 text-[clamp(2.4rem,6vw,4.6rem)] font-black leading-[0.92] tracking-[-0.05em] text-[#FFFDF8]">
                  {destino.nombre}
                </h1>

                <p className="mt-5 flex items-start gap-2.5 font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-[#F3EBDD]/65">
                  <Icono
                    nombre="ubicacion"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C6923B]"
                  />

                  <span>
                    {destino.direccion?.trim() || "Ubicación no registrada"}
                  </span>
                </p>

                <dl className="mt-8 grid grid-cols-2 gap-px border border-[#F3EBDD]/15 bg-[#F3EBDD]/15 sm:grid-cols-3">
                  <DatoRapido
                    etiqueta="Tiempo de visita"
                    valor={duracion}
                    icono="reloj"
                  />

                  <DatoRapido
                    etiqueta="Coordenadas"
                    valor={formatearCoordenadas(destino.ubicacion)}
                    icono="brujula"
                  />

                  <DatoRapido
                    etiqueta="Fuente"
                    valor={destino.fuente_origen}
                    icono="escudo"
                    className="col-span-2 sm:col-span-1"
                  />
                </dl>
              </div>

              <figure className="hidden border border-[#F3EBDD]/20 lg:block">
                <EncabezadoImagen
                  prioritaria
                  className="h-44 w-full object-cover"
                />

                <figcaption className="border-t border-[#F3EBDD]/15 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#F3EBDD]/55">
                  Portada / La Paz
                </figcaption>
              </figure>
            </div>
          </div>
        </header>

        {/* =========================================================
            CONTENIDO
        ========================================================== */}
        <div className="contenedor-medio px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
          <GaleriaDestino atractivo={destino} />

          <div className="mt-14 grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
            {/* Columna principal */}
            <div className="space-y-12">
              <section aria-labelledby="descripcion-destino">
                <header className="border-b border-[#5B3A29]/15 pb-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
                    01 / Sobre el destino
                  </p>

                  <h2
                    id="descripcion-destino"
                    className="font-display mt-2 text-[clamp(1.8rem,3vw,2.4rem)] font-black leading-none tracking-[-0.035em] text-[#233128]"
                  >
                    Descripción
                  </h2>
                </header>

                <p className="mt-6 whitespace-pre-line text-[0.95rem] leading-7 text-[#3F3A34]">
                  {destino.descripcion ||
                    "La descripción de este destino estará disponible próximamente."}
                </p>
              </section>

              <MapaDestino
                ubicacion={destino.ubicacion}
                nombreDestino={destino.nombre}
              />
            </div>

            {/* Columna lateral */}
            <div className="space-y-6">
              <HorarioTabla destinoId={destino.id} />

              <TarifaTabla destinoId={destino.id} />
            </div>
          </div>

          {/* Navegación inferior */}
          <section className="mt-16 border-t border-[#5B3A29]/15 pt-10">
            <div className="grid gap-6 bg-[#233128] px-6 py-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#E8C16A]">
                  05 / Sigue explorando
                </p>

                <p className="font-display mt-3 max-w-md text-[clamp(1.8rem,3vw,2.6rem)] font-black leading-[0.98] tracking-[-0.04em] text-[#FFFDF8]">
                  La ciudad no termina en esta ficha.
                </p>
              </div>

              <Link
                to={volverA}
                className="group inline-flex items-center justify-between gap-10 bg-[#F3EBDD] px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#233128] transition hover:bg-[#E8C16A]"
              >
                Volver al catálogo
                <span
                  className="font-display text-base transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Barra mínima de navegación de la ficha. */
function BarraFicha({ volverA }: { volverA: string }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="border-b border-[#5B3A29]/15">
      <div className="contenedor-medio flex h-[72px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
        >
          <span className="flex h-10 w-10 items-center justify-center bg-[#233128] text-[#F3EBDD]">
            <Icono nombre="montana" className="h-5 w-5" />
          </span>

          <span className="text-[0.95rem] font-black leading-none tracking-tight text-[#233128]">
            Turismo{" "}
            <span className="font-editorial text-[1.1rem] font-normal italic text-[#9A5B3C]">
              La Paz
            </span>
          </span>
        </Link>

        <p className="hidden font-mono text-[9px] uppercase tracking-[0.22em] text-[#746D63] md:block">
          Guía de campo <span className="text-[#C6923B]">/</span> Ficha de
          destino
        </p>

        <nav aria-label="Navegación de la ficha" className="flex items-center gap-5">
          <Link
            to={volverA}
            className="hidden text-[10px] font-black uppercase tracking-[0.16em] text-[#514B43] transition hover:text-[#233128] sm:inline"
          >
            Catálogo
          </Link>

          <Link
            to={isAuthenticated ? "/mi-cuenta" : "/login"}
            className="border-b border-[#233128]/30 pb-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32] whitespace-nowrap"
          >
            {isAuthenticated ? "Mi cuenta" : "Iniciar sesión"}
          </Link>
        </nav>
      </div>
    </div>
  );
}

/** Métrica destacada bajo el titular. */
function DatoRapido({
  etiqueta,
  valor,
  icono,
  className = "",
}: {
  etiqueta: string;
  valor: string;
  icono: NombreIcono;
  className?: string;
}) {
  return (
    <div className={`bg-[#233128] px-4 py-4 ${className}`}>
      <dt className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#F3EBDD]/55">
        <Icono nombre={icono} className="h-3.5 w-3.5 text-[#C6923B]" />
        {etiqueta}
      </dt>

      <dd className="mt-2 break-words font-mono text-xs font-semibold tabular-nums text-[#FFFDF8] sm:text-sm">
        {valor}
      </dd>
    </div>
  );
}
