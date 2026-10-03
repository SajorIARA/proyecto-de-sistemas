/**
 * Catálogo de destinos turísticos — ruta `/destinos`.
 *
 * Alcance definido por el Product Owner:
 *  - cuadrícula responsiva de cards (imagen, categoría, nombre,
 *    ubicación, descripción corta, botón "Ver detalle");
 *  - filtros tipo chip: Todos + 6 categorías oficiales, con "Todos"
 *    seleccionado al entrar;
 *  - paginación por scroll infinito consumiendo la API de Django sin
 *    recargas del navegador;
 *  - esqueletos de carga, estado vacío por categoría y estado de error
 *    con reintento.
 *
 * La categoría se mantiene en la URL (`?categoria=...`) para que el
 * filtro sea compartible y el botón "volver al catálogo" del detalle
 * pueda restaurarlo.
 */

import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import {
  CATEGORIA_TODOS,
  CATALOGO_PAGE_SIZE,
  esCategoriaOficial,
} from "../../../config/turismo";
import { useCatalogo } from "../hooks/useTurismo";
import { CatalogoVacio } from "../components/CatalogoVacio";
import { CategoriaFiltros } from "../components/CategoriaFiltros";
import { DestinoCard } from "../components/DestinoCard";
import { DestinoCardSkeleton } from "../components/Skeletons";
import { CatalogoError } from "../components/CatalogoError";

/**
 * Tarjetas de esqueleto durante la carga inicial. Se igualan al
 * `PAGE_SIZE` real del backend (20) para que la cuadrícula no dé un salto
 * de layout cuando lleguen los datos.
 */
const SKELETONS = CATALOGO_PAGE_SIZE;

export function CatalogoPage() {
  const { isAuthenticated } = useAuth();
  const [parametros, setParametros] = useSearchParams();

  const categoriaUrl = parametros.get("categoria");
  // Solo se aceptan las 6 categorías oficiales: si la URL trae otra cosa,
  // se cae en "Todos" en lugar de pedir un filtro inválido al backend.
  const categoria = useMemo(
    () => (esCategoriaOficial(categoriaUrl) ? categoriaUrl : null),
    [categoriaUrl],
  );

  const {
    destinos,
    total,
    hayMas,
    cargandoMas,
    isPending,
    isError,
    recargar,
    fetchNextPage,
  } = useCatalogo({ categoria });

  const centinela = useRef<HTMLDivElement | null>(null);

  const cambiarCategoria = (nueva: string | null) => {
    if (nueva === null) {
      parametros.delete("categoria");
    } else {
      parametros.set("categoria", nueva);
    }

    setParametros(parametros, { replace: true });
  };

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

  const titulo = categoria
    ? `Atractivos de ${categoria}`
    : "Todos los destinos de La Paz";

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

        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
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
          <div className="mt-14 max-w-3xl">
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

            <p className="mt-6 max-w-xl text-sm leading-7 text-[#F5EFE4]/70 sm:text-base">
              Historia, cultura, miradores y sabores paceños. Elige una
              categoría y empieza a planificar tu próxima visita.
            </p>
          </div>
        </div>
      </header>

      {/* =========================================================
          FILTROS
      ========================================================== */}
      <div className="sticky top-0 z-30 border-b border-[#5B3A29]/[0.08] bg-[#F3EBDD]/92 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CategoriaFiltros
              seleccionada={categoria}
              onChange={cambiarCategoria}
              disabled={isPending}
            />

            {!isPending && !isError && total > 0 && (
              <p
                className="shrink-0 text-xs font-bold text-[#746D63]"
                aria-live="polite"
              >
                {total} {total === 1 ? "destino" : "destinos"}
                {categoria ? ` en ${categoria}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          CUADRÍCULA
      ========================================================== */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        <h2 className="sr-only">{titulo}</h2>

        {isError && <CatalogoError onReintentar={() => void recargar()} />}

        {/* Esqueletos de carga */}
        {isPending && (
          <>
            <p className="mb-7 text-sm font-semibold text-[#746D63]" role="status">
              Cargando destinos turísticos…
            </p>

            <ul
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="catalogo-skeletons"
            >
              {Array.from({ length: SKELETONS }).map((_, indice) => (
                <li key={indice}>
                  <DestinoCardSkeleton />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Sin resultados */}
        {!isPending && !isError && destinos.length === 0 && (
          <CatalogoVacio
            categoria={categoria}
            onLimpiar={() => cambiarCategoria(null)}
          />
        )}

        {/* Tarjetas */}
        {!isPending && !isError && destinos.length > 0 && (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {destinos.map((atractivo) => (
                <li key={atractivo.id}>
                  <DestinoCard atractivo={atractivo} />
                </li>
              ))}
            </ul>

            {/* Centinela del scroll infinito */}
            <div ref={centinela} aria-hidden="true" className="h-px" />

            {/* Fallback accesible: botón "Cargar más" siempre disponible.
                Se mantiene visible por si IntersectionObserver no existe o
                el usuario navega con teclado. */}
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

              {categoria && (
                <button
                  type="button"
                  onClick={() => cambiarCategoria(null)}
                  className="text-xs font-bold text-[#8D4F32] underline-offset-4 hover:underline"
                >
                  Quitar filtro y ver {CATEGORIA_TODOS.toLowerCase()}
                </button>
              )}
            </div>
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
