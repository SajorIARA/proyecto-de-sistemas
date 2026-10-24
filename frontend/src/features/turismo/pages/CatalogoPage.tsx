/**
 * Catálogo de destinos turísticos — ruta `/destinos`.
 *
 * Alcance definido por el Product Owner:
 *  - cuadrícula responsiva de cards (imagen, categoría, nombre,
 *    ubicación, descripción corta, botón "Ver detalle");
 *  - buscador en tiempo real por texto con debounce (nombre, palabra
 *    clave o dirección);
 *  - panel de filtros combinables: categorías (chips), zona geográfica y
 *    rango de precio en BOB, todos conectados a los query params del
 *    backend (`q`, `categoria`, `zona`, `precio_min`, `precio_max`);
 *  - paginación por scroll infinito consumiendo la API de Django sin
 *    recargas del navegador;
 *  - esqueletos de carga, estado vacío y estado de error con reintento.
 *
 * Todo el estado de los filtros vive en la URL, así que una búsqueda es
 * compartible y el botón "volver al catálogo" del detalle la restaura.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { CATALOGO_PAGE_SIZE } from "../../../config/turismo";
import { useCatalogo, useFacetas, useAtractivosCercanos } from "../hooks/useTurismo";
import { useFiltrosCatalogo } from "../hooks/useFiltrosCatalogo";
import { CatalogoFiltros } from "../components/CatalogoFiltros";
import { CatalogoVacio } from "../components/CatalogoVacio";
import { DestinoCard } from "../components/DestinoCard";
import { DestinoCardSkeleton } from "../components/Skeletons";
import { CatalogoError } from "../components/CatalogoError";
import { EncabezadoImagen } from "../../../components/EncabezadoImagen";
import { LocationSelector, type UbicacionSeleccionada } from "../../../components/LocationSelector";

/**
 * Tarjetas de esqueleto durante la carga inicial. Se igualan al
 * `PAGE_SIZE` real del backend (20) para que la cuadrícula no dé un salto
 * de layout cuando lleguen los datos.
 */
const SKELETONS = CATALOGO_PAGE_SIZE;

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

  const destinos = usarCercanos && ubicacion
    ? destinosCercanosData?.results ?? []
    : destinosCatalogo;
  const total = usarCercanos && ubicacion ? destinos.length : totalCatalogo;
  const isPendingActual = usarCercanos && ubicacion ? isPendingCercanos : isPending;
  void (usarCercanos && ubicacion ? isFetchingCercanos : isFetching);
  const isErrorActual = usarCercanos && ubicacion ? isErrorCercanos : isError;
  const recargarActual = usarCercanos && ubicacion ? recargarCercanos : recargar;

  const handleUbicacionChange = (nuevaUbicacion: UbicacionSeleccionada) => {
    setUbicacion(nuevaUbicacion);
    setUsarCercanos(true);
  };

  const centinela = useRef<HTMLDivElement | null>(null);

  // Scroll infinito: dispara la siguiente página cuando el centinela entra
  // en pantalla. Se deja un margen de 400px para empezar a cargar antes de
  // que el usuario llegue al final.
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

  const titulo = filtros.categoria
    ? `Atractivos de ${filtros.categoria}`
    : "Todos los destinos de La Paz";

  // Hay una recarga en curso sobre datos ya visibles (cambio de filtro).
  const actualizando = isFetching && !isPending;
  const queryActiva = parametros.toString();

  return (
    <main className="min-h-screen bg-[#F3EBDD] text-[#263029]">
      {/* =========================================================
          ENCABEZADO
      ========================================================== */}
      <header className="relative overflow-hidden border-b border-[#5B3A29]/[0.08] bg-[#233128]">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(233,223,201,.35) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(233,223,201,.35) 25%, transparent 25%)
            `,
            backgroundSize: "52px 52px",
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#C6923B]/25 blur-[120px]"
          aria-hidden="true"
        />

        <div className="contenedor-amplio relative px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
          {/* Navegación */}
          <nav className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="group flex w-fit items-center gap-3 text-[#F3EBDD]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9DFC9]/25 bg-[#F5EFE4]/10 text-lg backdrop-blur-xl transition group-hover:bg-[#F5EFE4]/20">
                ⛰
              </span>

              <span className="text-base font-black tracking-tight">
                Turismo{" "}
                <span className="font-medium text-[#E7B75F]">La Paz</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden text-sm font-semibold text-[#F3EBDD]/75 transition hover:text-[#F3EBDD] sm:inline"
              >
                Inicio
              </Link>

              <Link
                to={isAuthenticated ? "/mi-cuenta" : "/login"}
                className="rounded-full bg-[#F3EBDD] px-5 py-2.5 text-sm font-black text-[#233128] transition hover:bg-[#FFFDF8]"
              >
                {isAuthenticated ? "Mi cuenta" : "Iniciar sesión"}
              </Link>
            </div>
          </nav>

          {/* Titular */}
          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-[#E9DFC9]/20 bg-[#1A241C]/40 px-4 py-2 text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#F1D79D] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-[#E7B75F]" />
                Catálogo turístico
              </p>

              <h1 className="mt-6 text-[clamp(2.4rem,6vw,4.2rem)] font-black leading-[0.95] tracking-[-0.04em] text-[#FFFDF8]">
                Descubre La Paz
                <span className="block text-[#E8D8B7]">
                  atractivo por atractivo.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#F5EFE4]/70 sm:text-base">
                Historia, cultura, miradores y sabores paceños. Busca por
                nombre o combina categoría, zona y precio para planificar tu
                próxima visita.
              </p>
            </div>

            <EncabezadoImagen
              prioritaria
              className="h-28 w-auto max-w-[42%] shrink-0 sm:h-40 lg:h-52"
            />
          </div>
        </div>
      </header>

      {/* =========================================================
          FILTROS
      ========================================================== */}
      <div className="sticky top-0 z-30 border-b border-[#5B3A29]/[0.08] bg-[#F3EBDD]/92 backdrop-blur-xl">
        <div className="contenedor-amplio px-6 py-4 sm:px-8 lg:px-10">
          <LocationSelector onUbicacionChange={handleUbicacionChange} />

          {usarCercanos && ubicacion && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-bold text-[#746D63]">
                Mostrando destinos cercanos a tu ubicación (radio ~2km)
              </p>
              <button
                type="button"
                onClick={() => {
                  setUsarCercanos(false);
                  setUbicacion(null);
                }}
                className="text-xs font-bold text-[#8D4F32] underline-offset-4 hover:underline"
              >
                Ver todo el catálogo
              </button>
            </div>
          )}

          {!usarCercanos && (
            <>
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

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {!isErrorActual && (
                  <p
                    className="text-xs font-bold text-[#746D63]"
                    aria-live="polite"
                  >
                    {total} {total === 1 ? "destino" : "destinos"}
                    {activos > 0
                      ? ` · ${activos} ${activos === 1 ? "filtro activo" : "filtros activos"}`
                      : ""}
                  </p>
                )}

                {actualizando && (
                  <p
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#8D4F32]"
                    role="status"
                  >
                    <span
                      className="h-2 w-2 animate-pulse rounded-full bg-[#9A5B3C]"
                      aria-hidden="true"
                    />
                    Actualizando resultados…
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* =========================================================
          CUADRÍCULA
      ========================================================== */}
      <div className="contenedor-amplio px-6 py-8 sm:px-8 lg:px-10 lg:py-12">
        <h2 className="sr-only">{titulo}</h2>

        {isErrorActual && <CatalogoError onReintentar={() => void recargarActual()} />}

        {/* Esqueletos de carga */}
        {isPendingActual && (
          <>
            <p className="mb-7 text-sm font-semibold text-[#746D63]" role="status">
              Cargando destinos turísticos…
            </p>

            <ul
              className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
              data-testid="catalogo-skeletons"
            >
              {Array.from({ length: SKELETONS }).map((_, indice) => (
                <li key={indice} className="h-full">
                  <DestinoCardSkeleton />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Sin resultados */}
        {!isPendingActual && !isErrorActual && destinos.length === 0 && (
          <>
            {usarCercanos && ubicacion ? (
              <div className="py-12 text-center">
                <p className="text-lg font-semibold text-[#263029]">
                  No hay destinos cercanos en un radio de 2 km
                </p>
                <p className="mt-2 text-sm text-[#746D63]">
                  Intenta con un macrodistrito o amplia la búsqueda al catálogo completo
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUsarCercanos(false);
                    setUbicacion(null);
                  }}
                  className="mt-4 inline-flex items-center rounded-full bg-[#2F4B3B] px-6 py-2.5 text-sm font-black text-[#F3EBDD] transition hover:bg-[#233128]"
                >
                  Ver todo el catálogo
                </button>
              </div>
            ) : (
              <CatalogoVacio
                categoria={filtros.categoria}
                filtrosActivos={activos}
                onLimpiar={limpiar}
              />
            )}
          </>
        )}

        {/* Tarjetas */}
        {!isPendingActual && !isErrorActual && destinos.length > 0 && (
          <>
            <ul
              className={[
                "grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
                actualizando && !usarCercanos ? "opacity-70 transition-opacity" : "",
              ].join(" ")}
            >
              {destinos.map((atractivo: any) => (
                <li key={atractivo.id} className="h-full">
                  <DestinoCard atractivo={atractivo} busqueda={queryActiva} />
                  {(atractivo.distancia_m !== undefined && atractivo.distancia_m !== null) && (
                    <p className="mt-1 text-xs text-[#746D63]">
                      A {(atractivo.distancia_m / 1000).toFixed(2)} km
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {/* Centinela del scroll infinito - solo para catálogo normal */}
            {!usarCercanos && <div ref={centinela} aria-hidden="true" className="h-px" />}

            {/* Fallback accesible: botón "Cargar más" siempre disponible. */}
            {!usarCercanos && (
              <div className="mt-12 flex flex-col items-center gap-4">
                {hayMas ? (
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={cargandoMas}
                    className="inline-flex items-center gap-3 rounded-full border border-[#2F4B3B]/25 bg-[#FFFDF8] px-7 py-3.5 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] hover:bg-[#2F4B3B] hover:text-[#FFFDF8] disabled:opacity-60"
                  >
                    {cargandoMas ? "Cargando más destinos…" : "Cargar más destinos"}
                    <span aria-hidden="true">↓</span>
                  </button>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A8177]">
                    Fin del catálogo · {destinos.length} de {total}
                  </p>
                )}
              </div>
            )}

            {usarCercanos && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A8177]">
                  {destinos.length} {destinos.length === 1 ? "destino cercano" : "destinos cercanos"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* =========================================================
          PIE
      ========================================================== */}
      <footer className="border-t border-[#5B3A29]/[0.08] px-6 py-10 text-center sm:px-8">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-[#8A8177]">
          Turismo La Paz · Bolivia
        </p>

        <p className="mt-3 text-xs text-[#746D63]">
          ¿No encuentras el destino que buscas?{" "}
          <Link
            to="/"
            className="font-bold text-[#8D4F32] underline-offset-4 hover:underline"
          >
            Vuelve al inicio
          </Link>
        </p>
      </footer>
    </main>
  );
}
