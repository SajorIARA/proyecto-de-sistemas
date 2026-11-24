/**
 * Catálogo de destinos turísticos — ruta `/destinos`.
 *
 * Se compone como una guía de campo: una portada editorial con fotografía,
 * un riel de filtros y un índice de fichas fotográficas de proporciones
 * distintas. La lógica no cambia respecto del catálogo original: filtros en
 * la URL, búsqueda con debounce, scroll infinito, facetas y modo cercanos.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { CATEGORIAS_OFICIALES } from "../../../config/turismo";
import { IMAGENES_SITIO } from "../../../config/imagenesSitio";
import { useCatalogo, useFacetas, useAtractivosCercanos } from "../hooks/useTurismo";
import { useFiltrosCatalogo } from "../hooks/useFiltrosCatalogo";
import { CatalogoFiltros } from "../components/CatalogoFiltros";
import { CatalogoVacio } from "../components/CatalogoVacio";
import { DestinoCard } from "../components/DestinoCard";
import { DestinoCardSkeleton } from "../components/Skeletons";
import { CatalogoError } from "../components/CatalogoError";
import { Icono } from "../../../components/site/Iconos";
import { LocationSelector, type UbicacionSeleccionada } from "../../../components/LocationSelector";

/** Suficientes esqueletos para llenar la primera pantalla sin exagerar. */
const SKELETONS = 6;

const FORMATO_NUMERO = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
});

function numero(valor: number): string {
  return String(valor).padStart(2, "0");
}

function monto(valor: number | null): string {
  return valor === null ? "—" : FORMATO_NUMERO.format(valor);
}

export function CatalogoPage() {
  const { isAuthenticated } = useAuth();
  const [parametros] = useSearchParams();
  const [ubicacion, setUbicacion] = useState<UbicacionSeleccionada | null>(null);
  const [usarCercanos, setUsarCercanos] = useState(false);

  const {
    filtros,
    activos,
    borrador,
    setBorrador,
    setCategoria,
    setZona,
    setRangoPrecio,
    limpiarTexto,
    limpiar,
  } = useFiltrosCatalogo();

  const { data: facetas } = useFacetas();

  const {
    destinos: destinosCatalogo,
    total: totalCatalogo,
    hayMas,
    cargandoMas,
    isPending,
    isFetching,
    isError,
    recargar,
    fetchNextPage,
  } = useCatalogo(filtros);

  const {
    data: destinosCercanosData,
    isPending: isPendingCercanos,
    isFetching: isFetchingCercanos,
    isError: isErrorCercanos,
    refetch: recargarCercanos,
  } = useAtractivosCercanos({
    lat: ubicacion?.latitud ?? null,
    lon: ubicacion?.longitud ?? null,
    radio: 2000,
    enabled: usarCercanos && ubicacion !== null,
  });

  const modoCercanos = usarCercanos && ubicacion !== null;
  const origenUbicacion =
    ubicacion?.tipo === "gps" ? "tu ubicación GPS" : ubicacion?.macrodistrito ?? "la zona elegida";

  const destinos = modoCercanos
    ? destinosCercanosData?.results ?? []
    : destinosCatalogo;
  const total = modoCercanos ? destinos.length : totalCatalogo;
  const isPendingActual = modoCercanos ? isPendingCercanos : isPending;
  const isErrorActual = modoCercanos ? isErrorCercanos : isError;
  const recargarActual = modoCercanos ? recargarCercanos : recargar;

  const handleUbicacionChange = (nuevaUbicacion: UbicacionSeleccionada | null) => {
    setUbicacion(nuevaUbicacion);
    setUsarCercanos(!!nuevaUbicacion);
  };

  const salirDeCercanos = () => {
    setUsarCercanos(false);
    setUbicacion(null);
  };

  const centinela = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nodo = centinela.current;

    if (!nodo || !hayMas || isPending) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting && hayMas && !cargandoMas) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    observador.observe(nodo);

    return () => observador.disconnect();
  }, [hayMas, isPending, cargandoMas, fetchNextPage]);

  const titulo = modoCercanos
    ? `Cerca de ${origenUbicacion}`
    : filtros.categoria
      ? `${filtros.categoria} en La Paz`
      : "Todas las paradas";

  const actualizando = modoCercanos
    ? isFetchingCercanos && !isPendingCercanos
    : isFetching && !isPending;
  const queryActiva = parametros.toString();

  const totalGuia = facetas?.total_atractivos ?? (totalCatalogo > 0 ? totalCatalogo : null);
  const totalCategorias = facetas?.categorias.length ?? CATEGORIAS_OFICIALES.length;
  const precios = facetas?.precios_bob;
  const textoPrecios =
    precios && (precios.min !== null || precios.max !== null)
      ? `Bs ${monto(precios.min)}–${monto(precios.max)}`
      : "—";

  return (
    <main className="min-h-screen bg-[#F3EBDD] text-[#263029]">
      <a
        href="#fichas"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[#FFFDF8] focus:px-5 focus:py-3 focus:text-sm focus:font-black focus:text-[#233128] focus:shadow-xl"
      >
        Saltar al índice de destinos
      </a>

      {/* =========================================================
          BARRA DE NAVEGACIÓN
      ========================================================== */}
      <div className="border-b border-[#5B3A29]/15">
        <div className="contenedor-amplio flex h-[72px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
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
            Guía de campo <span className="text-[#C6923B]">/</span> Catálogo
          </p>

          <nav aria-label="Navegación del catálogo" className="flex items-center gap-5">
            <Link
              to="/"
              className="hidden text-[10px] font-black uppercase tracking-[0.16em] text-[#514B43] transition hover:text-[#233128] sm:inline"
            >
              Portada
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

      {/* =========================================================
          PORTADA DE LA GUÍA
      ========================================================== */}
      <header className="relative overflow-hidden border-b border-[#5B3A29]/15">
        <div className="contenedor-amplio grid gap-10 px-4 pb-12 pt-10 sm:px-8 lg:grid-cols-12 lg:items-end lg:gap-14 lg:px-10 lg:pb-16 lg:pt-14">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[#5B3A29]/15 pb-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[#746D63]">
              <span>Catálogo de destinos</span>
              <span className="text-[#9A5B3C]">Edición 2026</span>
              <span>La Paz · Bolivia</span>
            </div>

            <h1 className="mt-8 font-display text-[clamp(3.1rem,7.6vw,6.6rem)] font-black leading-[0.86] tracking-[-0.06em] text-[#233128]">
              La Paz,
              <br />
              <span className="font-editorial font-normal italic text-[#9A5B3C]">
                parada por parada
              </span>
              .
            </h1>

            <div className="mt-8 grid gap-6 border-t border-[#5B3A29]/15 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <p className="max-w-xl text-sm leading-7 text-[#5C574E] sm:text-base">
                Una guía para bajar a la ciudad con los ojos abiertos: plazas
                que guardan historia, mercados que huelen a comino, miradores
                donde la hoyada se ordena y valles que parecen otro planeta.
              </p>

              <dl className="flex flex-wrap gap-x-7 gap-y-4">
                <DatoGuia
                  etiqueta="Destinos"
                  valor={totalGuia ? numero(totalGuia) : "—"}
                />
                <DatoGuia etiqueta="Categorías" valor={numero(totalCategorias)} />
                <DatoGuia etiqueta="Tarifas" valor={textoPrecios} />
              </dl>
            </div>

            <a
              href="#fichas"
              className="group mt-8 inline-flex items-center gap-3 border-b border-[#233128]/30 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32]"
            >
              Abrir el índice
              <span
                className="transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              >
                ↓
              </span>
            </a>
          </div>

          <figure className="relative lg:col-span-5">
            <div className="relative h-[320px] overflow-hidden bg-[#233128] sm:h-[420px] lg:h-[500px]">
              <img
                src={IMAGENES_SITIO.hero.naturaleza.src}
                alt={IMAGENES_SITIO.hero.naturaleza.alt}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101710]/70 via-transparent to-[#101710]/15" />

              <p className="absolute left-5 top-5 font-mono text-[9px] uppercase tracking-[0.22em] text-[#F3EBDD]/85">
                Portada · La Paz
              </p>

              <p className="absolute bottom-5 left-5 hidden font-mono text-[9px] uppercase tracking-[0.18em] text-[#F3EBDD]/75 min-[380px]:block">
                16°30′ S · 68°09′ O
              </p>

              <img
                src={IMAGENES_SITIO.categorias.Miradores.src}
                alt=""
                loading="lazy"
                decoding="async"
                aria-hidden="true"
                className="absolute bottom-4 right-4 h-28 w-36 border-4 border-[#F3EBDD] object-cover"
              />
            </div>

            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#746D63]">
              <span>Valle de la Luna · Mallasa</span>
              <span>3.200 m</span>
            </figcaption>
          </figure>
        </div>
      </header>

      {/* =========================================================
          RIEL DE FILTROS + ÍNDICE DE FICHAS
      ========================================================== */}
      <div className="bg-[#FFFDF8]">
        <div className="contenedor-amplio grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            aria-label="Filtros del catálogo"
            className="border-b border-[#5B3A29]/15 px-0 py-8 lg:border-b-0 lg:border-r lg:pr-8 lg:py-10"
          >
            {modoCercanos && (
              <p className="mb-6 border-l-2 border-[#9A5B3C] pl-3 text-[11px] leading-5 text-[#746D63]">
                Estás viendo destinos cercanos. Los filtros de la guía se aplican
                al volver al catálogo completo.
              </p>
            )}

            <CatalogoFiltros
              filtros={filtros}
              borrador={borrador}
              facetas={facetas ?? null}
              disabled={isPendingActual}
              onBuscar={setBorrador}
              onLimpiarTexto={limpiarTexto}
              onCategoria={setCategoria}
              onZona={setZona}
              onPrecio={setRangoPrecio}
              onLimpiar={limpiar}
            />

            <div className="mt-8 border-t border-[#5B3A29]/15 pt-6">
              <LocationSelector onUbicacionChange={handleUbicacionChange} />
            </div>
          </aside>

          <section
            id="fichas"
            aria-labelledby="titulo-fichas"
            className="scroll-mt-6 border-t border-[#5B3A29]/15 py-8 lg:border-t-0 lg:py-10"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-[#5B3A29]/15 pb-6">
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
                  Índice de fichas
                </p>

                <h2
                  id="titulo-fichas"
                  className="mt-2 font-display text-[clamp(1.9rem,3.3vw,2.9rem)] font-black leading-none tracking-[-0.045em] text-[#233128]"
                >
                  {titulo}
                </h2>
              </div>

              <div className="text-right">
                <p
                  className="font-display text-[2.7rem] font-black leading-none tracking-[-0.06em] text-[#233128] tabular-nums"
                  aria-live="polite"
                >
                  {isErrorActual ? "—" : numero(total)}
                </p>

                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]">
                  {modoCercanos
                    ? total === 1
                      ? "cercano"
                      : "cercanos"
                    : total === 1
                      ? "ficha"
                      : "fichas"}
                </p>

                {!modoCercanos && activos > 0 && (
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#9A5B3C]">
                    {activos} {activos === 1 ? "filtro" : "filtros"}
                  </p>
                )}
              </div>
            </div>

            {modoCercanos && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[#2F4B3B]/20 bg-[#2F4B3B]/[0.04] px-4 py-3">
                <p className="text-xs leading-5 text-[#3F4A42]">
                  <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#2F4B3B]">
                    Cerca de ti
                  </span>
                  {origenUbicacion} · radio de 2 km
                </p>

                <button
                  type="button"
                  onClick={salirDeCercanos}
                  className="border-b border-[#233128]/30 pb-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32]"
                >
                  Volver al catálogo completo
                </button>
              </div>
            )}

            {actualizando && (
              <p
                className="mt-4 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8D4F32]"
                role="status"
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9A5B3C]"
                  aria-hidden="true"
                />
                {modoCercanos
                  ? "Actualizando destinos cercanos…"
                  : "Actualizando resultados…"}
              </p>
            )}

            {isErrorActual && (
              <div className="mt-8">
                <CatalogoError onReintentar={() => void recargarActual()} />
              </div>
            )}

            {isPendingActual && (
              <section aria-label="Cargando destinos" aria-busy="true" className="mt-8">
                <p
                  className="mb-6 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]"
                  role="status"
                >
                  {modoCercanos
                    ? `Buscando destinos cercanos a ${origenUbicacion}…`
                    : "Cargando fichas del catálogo…"}
                </p>

                <ul
                  className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
                  data-testid="catalogo-skeletons"
                >
                  {Array.from({ length: SKELETONS }).map((_, indice) => (
                    <li key={indice} className="min-w-0">
                      <DestinoCardSkeleton />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!isPendingActual && !isErrorActual && destinos.length === 0 && (
              <>
                {modoCercanos ? (
                  <section
                    className="mt-8 grid gap-6 border-y border-[#5B3A29]/20 py-14 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10 sm:py-16"
                    aria-label="Sin destinos cercanos"
                  >
                    <p
                      className="font-display text-[5.5rem] font-black leading-[0.8] tracking-[-0.08em] text-[#E9DFC9] sm:text-[7rem]"
                      aria-hidden="true"
                    >
                      00
                    </p>

                    <div className="max-w-2xl">
                      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
                        Sin resultados cerca de ti
                      </p>

                      <h3 className="mt-3 font-display text-2xl font-black leading-tight tracking-[-0.03em] text-[#233128] sm:text-[1.6rem]">
                        No encontramos destinos cercanos en este momento
                      </h3>

                      <p className="mt-4 text-sm leading-7 text-[#514B43]">
                        No hay atractivos registrados en un radio aproximado de 2
                        km desde {origenUbicacion}. Prueba con otra ubicación o
                        explora el catálogo completo para ver todas las opciones
                        disponibles.
                      </p>

                      <button
                        type="button"
                        onClick={salirDeCercanos}
                        className="mt-7 inline-flex min-h-11 items-center gap-3 border-b-2 border-[#233128] pb-1 text-xs font-black uppercase tracking-[0.16em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32]"
                      >
                        Ver todo el catálogo
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </section>
                ) : (
                  <div className="mt-8">
                    <CatalogoVacio
                      categoria={filtros.categoria}
                      filtrosActivos={activos}
                      onLimpiar={limpiar}
                    />
                  </div>
                )}
              </>
            )}

            {!isPendingActual && !isErrorActual && destinos.length > 0 && (
              <>
                <ul
                  className={[
                    "mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4",
                    actualizando ? "opacity-60 transition-opacity duration-200" : "",
                  ].join(" ")}
                >
                  {destinos.map((atractivo, indice) => {
                    const distanciaM = (atractivo as { distancia_m?: number | null })
                      .distancia_m;

                    return (
                      <li key={atractivo.id} className="min-w-0">
                        <DestinoCard
                          atractivo={atractivo}
                          busqueda={queryActiva}
                          indice={indice}
                          total={total}
                        />

                        {distanciaM !== undefined && distanciaM !== null && (
                          <p className="mt-2 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#746D63]">
                            <Icono
                              nombre="ubicacion"
                              className="h-3 w-3 text-[#8D4F32]"
                              aria-hidden="true"
                            />
                            A {(distanciaM / 1000).toFixed(2)} km
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {!modoCercanos && (
                  <div ref={centinela} aria-hidden="true" className="h-px" />
                )}

                {!modoCercanos && (
                  <div className="mt-14 flex flex-col items-center gap-5">
                    {hayMas ? (
                      <button
                        type="button"
                        onClick={() => void fetchNextPage()}
                        disabled={cargandoMas}
                        className="inline-flex min-h-12 items-center gap-3 border border-[#233128]/25 px-7 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#233128] transition hover:border-[#233128] hover:bg-[#233128] hover:text-[#FFFDF8] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {cargandoMas ? "Cargando más destinos…" : "Cargar más destinos"}
                        <Icono
                          nombre="flecha"
                          className="h-4 w-4 rotate-90"
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <div className="flex w-full max-w-xl items-center gap-4">
                        <span className="h-px flex-1 bg-[#5B3A29]/15" aria-hidden="true" />
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A8177]">
                          Fin del catálogo · {destinos.length} de {total}
                        </p>
                        <span className="h-px flex-1 bg-[#5B3A29]/15" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                )}

                {modoCercanos && (
                  <p className="mt-14 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]">
                    {destinos.length}{" "}
                    {destinos.length === 1 ? "destino cercano" : "destinos cercanos"}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* =========================================================
          CIERRE
      ========================================================== */}
      <footer className="bg-[#1B241D] text-[#F3EBDD]">
        <div className="contenedor-amplio grid gap-8 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-10 lg:py-16">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#E8C16A]">
              Fin del catálogo
            </p>

            <p className="mt-4 max-w-2xl font-display text-[clamp(2rem,4vw,3.4rem)] font-black leading-[0.94] tracking-[-0.045em] text-[#FFFDF8]">
              La ciudad sigue{" "}
              <span className="font-editorial font-normal italic text-[#E8C16A]">
                arriba
              </span>
              .
            </p>

            <p className="mt-4 max-w-md text-sm leading-7 text-[#F3EBDD]/60">
              Vuelve a la portada para armar tu ruta por zonas, sabores y datos
              útiles antes de subir.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center gap-3 border border-[#F3EBDD]/25 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F3EBDD] transition hover:border-[#E8C16A] hover:text-[#E8C16A]"
          >
            Volver a la portada
            <Icono nombre="flecha" className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </main>
  );
}

function DatoGuia({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]">
        {etiqueta}
      </dt>
      <dd className="mt-1 font-display text-sm font-black text-[#233128]">{valor}</dd>
    </div>
  );
}
