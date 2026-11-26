import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CATALOGO_PAGE_SIZE } from "../../../config/turismo";
import { Button, ButtonLink } from "../../../design-system/components/Button";
import { LocationSelector, type UbicacionSeleccionada } from "../../../components/LocationSelector";
import { SiteFooter } from "../../../components/site/SiteFooter";
import { SiteHeader } from "../../../components/site/SiteHeader";
import { Icono } from "../../../components/site/Iconos";
import type { Atractivo } from "../../../types/turismo";
import { CatalogoError } from "../components/CatalogoError";
import { CatalogoFiltros } from "../components/CatalogoFiltros";
import { CatalogoVacio } from "../components/CatalogoVacio";
import { DestinoCard } from "../components/DestinoCard";
import { DestinoCardSkeleton } from "../components/Skeletons";
import { useRuta } from "../context/RutaContext";
import { useFiltrosCatalogo } from "../hooks/useFiltrosCatalogo";
import { useAtractivosCercanos, useCatalogo, useFacetas } from "../hooks/useTurismo";
import { RutaBuilderPage } from "./RutaBuilderPage";
import { ChatFlotanteCatalogo } from "../components/ChatFlotanteCatalogo";

const SKELETONS = CATALOGO_PAGE_SIZE;

export function CatalogoPage() {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const vistaArmarRuta = parametros.get("vista") === "armar";
  const [ubicacion, setUbicacion] = useState<UbicacionSeleccionada | null>(null);
  const [usarCercanos, setUsarCercanos] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const botonFiltrosRef = useRef<HTMLButtonElement | null>(null);
  const panelFiltrosRef = useRef<HTMLElement | null>(null);
  const centinela = useRef<HTMLDivElement | null>(null);
  const { destinos: ruta, contiene, alternar } = useRuta();

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
  const catalogo = useCatalogo(filtros);
  const cercanos = useAtractivosCercanos({
    lat: ubicacion?.latitud ?? null,
    lon: ubicacion?.longitud ?? null,
    radio: 2000,
    enabled: usarCercanos && ubicacion !== null,
  });

  const modoCercanos = usarCercanos && ubicacion !== null;
  const origen =
    ubicacion?.tipo === "gps"
      ? "tu ubicación"
      : ubicacion?.macrodistrito ?? "la zona elegida";
  const destinos = modoCercanos
    ? cercanos.data?.results ?? []
    : catalogo.destinos;
  const total = modoCercanos ? destinos.length : catalogo.total;
  const pendiente = modoCercanos ? cercanos.isPending : catalogo.isPending;
  const error = modoCercanos ? cercanos.isError : catalogo.isError;
  const actualizando = modoCercanos
    ? cercanos.isFetching && !cercanos.isPending
    : catalogo.isFetching && !catalogo.isPending;

  useEffect(() => {
    if (!filtrosAbiertos) return;

    const desbordamientoPrevio = document.body.style.overflow;
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setFiltrosAbiertos(false);
        botonFiltrosRef.current?.focus();
      }
    };
    document.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";
    const cuadro = requestAnimationFrame(() => panelFiltrosRef.current?.focus());

    return () => {
      cancelAnimationFrame(cuadro);
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = desbordamientoPrevio;
    };
  }, [filtrosAbiertos]);

  useEffect(() => {
    const nodo = centinela.current;
    if (
      !nodo ||
      !catalogo.hayMas ||
      catalogo.isPending ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (
          entradas[0]?.isIntersecting &&
          catalogo.hayMas &&
          !catalogo.cargandoMas
        ) {
          void catalogo.fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [
    catalogo.hayMas,
    catalogo.isPending,
    catalogo.cargandoMas,
    catalogo.fetchNextPage,
  ]);

  function cambiarUbicacion(nuevaUbicacion: UbicacionSeleccionada | null) {
    setUbicacion(nuevaUbicacion);
    setUsarCercanos(nuevaUbicacion !== null);
  }

  function gestionarRuta(atractivo: Atractivo) {
    const yaIncluido = contiene(atractivo.id);
    alternar(atractivo);
    if (!yaIncluido) {
      const siguiente = new URLSearchParams(parametros);
      siguiente.set("vista", "armar");
      navigate(`/destinos?${siguiente.toString()}`);
    }
  }

  function recargar() {
    if (modoCercanos) {
      void cercanos.refetch();
    } else {
      void catalogo.recargar();
    }
  }

  const queryActiva = parametros.toString();

  return (
    <div className="chuki-page min-h-screen bg-[var(--color-canvas)]">
      <SiteHeader />
      <main id="contenido-principal">
        {vistaArmarRuta ? (
          <>
            <header className="contenedor-amplio max-w-[84rem] px-4 pb-2 pt-6 sm:px-8 sm:pt-8">
              <h1 className="text-2xl font-black sm:text-3xl">Planifica tu recorrido</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                Elige tus paradas, revisa los detalles y organiza tu visita a La Paz.
              </p>
            </header>
            <section className="contenedor-amplio max-w-[84rem] px-4 pb-8 pt-4 sm:px-8 sm:pb-12">
              <RutaBuilderPage embebido />
            </section>
          </>
        ) : (
          <>
            <header className="relative isolate min-h-[32rem] overflow-hidden bg-[var(--lp-night)] text-white">
              <img
                src="/images/catalogo-illimani.jpg"
                alt=""
                width="1280"
                height="850"
                fetchPriority="high"
                className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,25,45,.96)_0%,rgba(7,25,45,.72)_52%,rgba(7,25,45,.2)_100%),linear-gradient(0deg,rgba(7,25,45,.75),transparent_55%)]" />
              <div className="lp-topographic absolute inset-0 -z-10 opacity-50" />
              <div className="contenedor-amplio flex min-h-[32rem] items-end py-12 sm:py-16">
                <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                  <div className="max-w-3xl">
                    <p className="font-data text-sm font-bold text-[var(--lp-sun)]">
                      EXPLORA LA HOYADA
                    </p>
                    <h1 className="lp-editorial-title mt-4 text-[clamp(3.5rem,7vw,7.5rem)] leading-[0.82]">
                      Encuentra la vista que no vas a olvidar
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/75">
                      Montañas, mercados, memoria y sabores. Empieza por lo que te mueve y añade cada hallazgo a tu viaje.
                    </p>
                  </div>
                  <div className="lp-catalog-tabs grid grid-cols-2 gap-2 border border-white/25 bg-[var(--lp-night)]/55 p-1 backdrop-blur-md">
                    <ButtonLink to="/destinos" variante="secondary">
                      Explorar
                    </ButtonLink>
                    <ButtonLink
                      to="/destinos?vista=armar"
                      variante="quiet"
                      className="text-white hover:bg-white/10"
                    >
                      Planificar
                      <span className="font-data">{ruta.length}</span>
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </header>
            <section className="sticky top-[69px] z-30 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/95 py-4 backdrop-blur-md">
              <div className="contenedor-amplio flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    <span className="font-data">{total}</span>{" "}
                    {total === 1 ? "destino" : "destinos"}
                    {modoCercanos ? ` cerca de ${origen}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {activos > 0
                      ? `${activos} ${activos === 1 ? "filtro activo" : "filtros activos"}`
                      : "Catálogo completo"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {modoCercanos && (
                    <Button
                      variante="quiet"
                      onClick={() => {
                        setUsarCercanos(false);
                        setUbicacion(null);
                      }}
                    >
                      Ver todo
                    </Button>
                  )}
                  <Button
                    ref={botonFiltrosRef}
                    variante="secondary"
                    onClick={() => setFiltrosAbiertos(true)}
                    aria-haspopup="dialog"
                    aria-expanded={filtrosAbiertos}
                  >
                    <Icono nombre="buscar" className="h-4 w-4" />
                    Filtros y búsqueda
                    {activos > 0 && (
                      <span className="font-data text-xs">{activos}</span>
                    )}
                  </Button>
                </div>
                {actualizando && (
                  <p className="w-full text-xs font-bold text-[var(--color-brand)]" role="status">
                    Actualizando resultados…
                  </p>
                )}
              </div>
            </section>

            {filtrosAbiertos && (
              <>
                <button
                  type="button"
                  aria-label="Cerrar panel de filtros"
                  onClick={() => setFiltrosAbiertos(false)}
                  className="fixed inset-0 z-[60] bg-[var(--color-text)]/55"
                />
                <aside
                  ref={panelFiltrosRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filtros del catálogo"
                  tabIndex={-1}
                  className="fixed bottom-0 right-0 top-0 z-[70] w-full max-w-md overflow-y-auto overscroll-contain bg-[var(--color-surface)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--lp-shadow-float)] outline-none sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
                    <div>
                      <h2 className="text-2xl font-black">Buscar y filtrar</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                        Empieza por una búsqueda. Añade filtros solo si los necesitas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiltrosAbiertos(false)}
                      aria-label="Cerrar filtros"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-[var(--color-border-strong)]"
                    >
                      <Icono nombre="cerrar" className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-6 space-y-5">
                    <LocationSelector
                      onUbicacionChange={cambiarUbicacion}
                      compacto
                    />
                    <CatalogoFiltros
                      filtros={filtros}
                      borrador={borrador}
                      facetas={facetas ?? null}
                      disabled={pendiente}
                      onBuscar={setBorrador}
                      onLimpiarTexto={limpiarTexto}
                      onCategoria={setCategoria}
                      onZona={setZona}
                      onPrecio={setRangoPrecio}
                      onLimpiar={limpiar}
                      siempreAbierto
                    />
                  </div>
                  <Button
                    variante="primary"
                    className="mt-6 w-full"
                    onClick={() => setFiltrosAbiertos(false)}
                  >
                    Ver {total} {total === 1 ? "resultado" : "resultados"}
                  </Button>
                </aside>
              </>
            )}

            <section className="contenedor-amplio py-8 sm:py-12">
              <h2 className="sr-only">Resultados del catálogo</h2>
              {error && <CatalogoError onReintentar={recargar} />}

              {pendiente && (
                <div aria-label="Cargando destinos" aria-busy="true">
                  <p className="mb-5 text-sm text-[var(--color-text-muted)]" role="status">
                    Cargando destinos turísticos…
                  </p>
                  <ul
                    className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    data-testid="catalogo-skeletons"
                  >
                    {Array.from({ length: SKELETONS }).map((_, indice) => (
                      <li key={indice}>
                        <DestinoCardSkeleton />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!pendiente && !error && destinos.length === 0 && (
                modoCercanos ? (
                  <div className="lp-panel px-6 py-14 text-center">
                    <Icono nombre="ubicacion" className="mx-auto h-9 w-9 text-[var(--color-route)]" />
                    <h3 className="mt-5 text-xl font-black">No hay destinos registrados cerca</h3>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
                      Prueba otra ubicación o vuelve al catálogo completo.
                    </p>
                    <Button
                      variante="primary"
                      className="mt-6"
                      onClick={() => {
                        setUsarCercanos(false);
                        setUbicacion(null);
                      }}
                    >
                      Ver todos los destinos
                    </Button>
                  </div>
                ) : (
                  <CatalogoVacio
                    categoria={filtros.categoria}
                    filtrosActivos={activos}
                    onLimpiar={limpiar}
                  />
                )
              )}

              {!pendiente && !error && destinos.length > 0 && (
                <>
                   <ul
                    className={`catalogo-mosaico ${
                      actualizando ? "opacity-60" : ""
                    }`}
                  >
                    {destinos.map((atractivo) => (
                      <li key={atractivo.id} className="min-w-0">
                        <DestinoCard
                          atractivo={atractivo}
                          busqueda={queryActiva}
                          enRuta={contiene(atractivo.id)}
                          onAlternarRuta={() => gestionarRuta(atractivo)}
                        />
                      </li>
                    ))}
                  </ul>
                  {!modoCercanos && <div ref={centinela} className="h-px" aria-hidden="true" />}
                  {!modoCercanos && catalogo.hayMas && (
                    <div className="mt-10 flex justify-center">
                      <Button
                        variante="secondary"
                        onClick={() => void catalogo.fetchNextPage()}
                        disabled={catalogo.cargandoMas}
                      >
                        {catalogo.cargandoMas ? "Cargando más destinos…" : "Cargar más destinos"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>

            {ruta.length > 0 && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgb(16_42_67_/_0.14)]">
                <div className="contenedor-medio flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold">Mi viaje</p>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {ruta.length} {ruta.length === 1 ? "destino añadido" : "destinos añadidos"}
                    </p>
                  </div>
                  <ButtonLink to="/destinos?vista=armar" variante="route">
                    Organizar recorrido
                  </ButtonLink>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
      <ChatFlotanteCatalogo destinos={destinos} />
    </div>
  );
}
