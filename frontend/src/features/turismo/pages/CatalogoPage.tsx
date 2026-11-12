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
import { Icono } from "../../../components/site/Iconos";
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
  const actualizando = modoCercanos
    ? isFetchingCercanos && !isPendingCercanos
    : isFetching && !isPending;
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
        <div
          className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#6F8064]/20 blur-[90px]"
          aria-hidden="true"
        />

        <div className="contenedor-amplio relative px-4 py-10 sm:px-8 lg:px-10 lg:py-14">
          {/* Navegación */}
          <nav className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="group flex w-fit items-center gap-3 text-[#F3EBDD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
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
                className="hidden text-sm font-semibold text-[#F3EBDD]/75 transition hover:text-[#F3EBDD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B] sm:inline"
              >
                Inicio
              </Link>

              <Link
                to={isAuthenticated ? "/mi-cuenta" : "/login"}
                className="rounded-full bg-[#F3EBDD] px-5 py-2.5 text-sm font-black text-[#233128] transition hover:bg-[#FFFDF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
              >
                {isAuthenticated ? "Mi cuenta" : "Iniciar sesión"}
              </Link>
            </div>
          </nav>

          {/* Titular */}
          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-[#E9DFC9]/20 bg-[#1A241C]/45 px-4 py-2 text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#F1D79D] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-[#E7B75F]" aria-hidden="true" />
                La Paz se vive · Catálogo turístico
              </p>

              <h1 className="mt-6 text-[clamp(2.2rem,6vw,4.2rem)] font-black leading-[0.96] tracking-[-0.04em] text-[#FFFDF8]">
                Descubre La Paz
                <span className="block text-[#E8D8B7]">
                  atractivo por atractivo.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#F5EFE4]/78 sm:text-base">
                Historia, cultura, miradores y sabores paceños. Explora el catálogo completo o descubre destinos cercanos para planificar tu próxima visita con claridad.
              </p>
            </div>

            <EncabezadoImagen
              prioritaria
              className="h-24 w-auto max-w-[46%] shrink-0 sm:h-40 lg:h-52"
            />
          </div>
        </div>
      </header>

      {/* =========================================================
          FILTROS
      ========================================================== */}
      <div className="relative z-30 border-b border-[#5B3A29]/[0.08] bg-[#F3EBDD]/94 backdrop-blur-xl">
        <div className="contenedor-amplio px-4 py-4 sm:px-8 lg:px-10">
          <section
            aria-label="Elegir modo de exploración"
            className="mt-2 rounded-[1.5rem] border border-[#5B3A29]/10 bg-[#FFFDF8]/70 p-3 sm:p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
                  {modoCercanos ? "Modo activo: destinos cercanos" : "Modo activo: catálogo completo"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#514B43]">
                  {modoCercanos
                    ? `Viendo resultados cerca de ${origenUbicacion} (radio aproximado: 2 km). Puedes volver al catálogo completo en cualquier momento.`
                    : "Explora todo La Paz con búsqueda y filtros combinables. Usa la ubicación si quieres ver solo opciones cercanas."}
                </p>
              </div>
              {modoCercanos && (
                <button
                  type="button"
                  onClick={() => {
                    setUsarCercanos(false);
                    setUbicacion(null);
                  }}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#2F4B3B]/20 bg-[#FFFDF8] px-4 py-2.5 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] hover:bg-[#2F4B3B] hover:text-[#FFFDF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
                >
                  Volver al catálogo completo
                </button>
              )}
            </div>

            <div className="mt-4">
              <LocationSelector onUbicacionChange={handleUbicacionChange} />
            </div>

            {modoCercanos && ubicacion && (
              <div
                className="mt-3 rounded-2xl border border-[#2F4B3B]/12 bg-[#2F4B3B]/[0.05] px-4 py-3"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm font-bold text-[#233128]">
                  Mostrando destinos cercanos según {origenUbicacion}.
                </p>
                <p className="mt-1 text-xs leading-5 text-[#5E5A52]">
                  Los filtros del catálogo no reemplazan esta búsqueda por proximidad; usa &quot;Volver al catálogo completo&quot; para aplicar filtros sobre todo el listado.
                </p>
              </div>
            )}
          </section>

          <div className={modoCercanos ? "mt-4 opacity-[0.88]" : "mt-4"}>
            {!modoCercanos && (
              <p className="mb-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
                Buscar y filtrar el catálogo
              </p>
            )}
            {modoCercanos && (
              <p className="mb-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
                Filtros del catálogo (disponibles al volver al catálogo completo)
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {!isErrorActual && (
                <p
                  className="text-sm font-semibold text-[#5E5A52]"
                  aria-live="polite"
                >
                  <span className="font-black text-[#233128]">{total}</span>{" "}
                  {total === 1 ? "destino" : "destinos"}
                  {modoCercanos
                    ? ` cercanos a ${origenUbicacion}`
                    : activos > 0
                      ? ` · ${activos} ${activos === 1 ? "filtro activo" : "filtros activos"}`
                      : " en el catálogo"}
                </p>
              )}

              {actualizando && (
                <p
                  className="inline-flex items-center gap-2 rounded-full bg-[#9A5B3C]/10 px-3 py-1.5 text-xs font-bold text-[#8D4F32]"
                  role="status"
                >
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-[#9A5B3C]"
                    aria-hidden="true"
                  />
                  {modoCercanos ? "Actualizando destinos cercanos…" : "Actualizando resultados…"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          CUADRÍCULA
      ========================================================== */}
      <div className="contenedor-amplio px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
        <h2 className="sr-only">{titulo}</h2>

        {isErrorActual && <CatalogoError onReintentar={() => void recargarActual()} />}

        {/* Esqueletos de carga */}
        {isPendingActual && (
          <section aria-label="Cargando destinos" aria-busy="true">
            <p className="mb-6 text-sm font-semibold text-[#5E5A52]" role="status">
              {modoCercanos
                ? `Buscando destinos cercanos a ${origenUbicacion}…`
                : "Cargando destinos turísticos del catálogo…"}
            </p>

            <ul
              className="grid gap-x-5 gap-y-7 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 2xl:grid-cols-4"
              data-testid="catalogo-skeletons"
            >
              {Array.from({ length: SKELETONS }).map((_, indice) => (
                <li key={indice} className="h-full min-w-0">
                  <DestinoCardSkeleton />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sin resultados */}
        {!isPendingActual && !isErrorActual && destinos.length === 0 && (
          <>
            {modoCercanos ? (
              <section
                className="rounded-[2rem] border border-dashed border-[#5B3A29]/20 bg-[#FFFDF8]/75 px-5 py-14 text-center sm:px-6 sm:py-16"
                aria-label="Sin destinos cercanos"
              >
                <span
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2F4B3B]/10 text-[#2F4B3B]"
                  aria-hidden="true"
                >
                  <Icono nombre="ubicacion" className="h-8 w-8" />
                </span>
                <h3 className="mt-6 text-xl font-black tracking-tight text-[#233128]">
                  No encontramos destinos cercanos en este momento
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#514B43]">
                  No hay atractivos registrados en un radio aproximado de 2 km desde {origenUbicacion}. Prueba con otra ubicación o explora el catálogo completo para ver todas las opciones disponibles.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUsarCercanos(false);
                      setUbicacion(null);
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
                  >
                    Ver todo el catálogo
                  </button>
                </div>
              </section>
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
                "grid gap-x-5 gap-y-7 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 2xl:grid-cols-4",
                actualizando ? "opacity-75 transition-opacity duration-200" : "",
              ].join(" ")}
            >
              {destinos.map((atractivo) => {
                const distanciaM = (atractivo as { distancia_m?: number | null }).distancia_m;

                return (
                  <li key={atractivo.id} className="h-full min-w-0">
                    <DestinoCard atractivo={atractivo} busqueda={queryActiva} />
                    {distanciaM !== undefined && distanciaM !== null && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8]/80 px-3 py-1 text-xs font-semibold text-[#5E5A52]">
                        <Icono nombre="ubicacion" className="h-3.5 w-3.5 text-[#8D4F32]" />
                        A {(distanciaM / 1000).toFixed(2)} km
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Centinela del scroll infinito - solo para catálogo normal */}
            {!modoCercanos && <div ref={centinela} aria-hidden="true" className="h-px" />}

            {/* Fallback accesible: botón "Cargar más" siempre disponible. */}
            {!modoCercanos && (
              <div className="mt-12 flex flex-col items-center gap-4">
                {hayMas ? (
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={cargandoMas}
                    className="inline-flex min-h-12 items-center gap-3 rounded-full border border-[#2F4B3B]/25 bg-[#FFFDF8] px-7 py-3.5 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] hover:bg-[#2F4B3B] hover:text-[#FFFDF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B] disabled:opacity-60"
                  >
                    {cargandoMas ? "Cargando más destinos…" : "Cargar más destinos"}
                    <Icono nombre="flecha" className="h-4 w-4 rotate-90" aria-hidden="true" />
                  </button>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A8177]">
                    Fin del catálogo · {destinos.length} de {total}
                  </p>
                )}
              </div>
            )}

            {modoCercanos && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <p className="rounded-full bg-[#FFFDF8]/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#746D63]">
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
            className="font-bold text-[#8D4F32] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
          >
            Vuelve al inicio
          </Link>
        </p>
      </footer>
    </main>
  );
}
