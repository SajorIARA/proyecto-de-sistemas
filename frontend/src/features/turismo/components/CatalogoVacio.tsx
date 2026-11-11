/**
 * Estados sin resultados del catálogo.
 *
 * El Product Owner pidió explícitamente el mensaje: "No encontramos
 * atractivos turísticos disponibles en esta categoría." para el caso de
 * una categoría sin destinos (hoy Aventura y Arqueología están vacías en
 * el seed, así que este estado es real y no hipotético). Ese mensaje se reserva
 * para cuando la categoría es el único filtro; con filtros combinados (texto,
 * zona o precio) se usa un mensaje genérico y se ofrece quitarlos todos.
 */

import { Icono } from "../../../components/site/Iconos";

interface CatalogoVacioProps {
  /** Categoría filtrada, o `null` si no hay filtro de categoría. */
  categoria: string | null;
  /** Número de filtros activos, para elegir el mensaje y el botón. */
  filtrosActivos?: number;
  onLimpiar: () => void;
}

export function CatalogoVacio({
  categoria,
  filtrosActivos = categoria !== null ? 1 : 0,
  onLimpiar,
}: CatalogoVacioProps) {
  const hayFiltros = filtrosActivos > 0;
  const soloCategoria = filtrosActivos === 1 && categoria !== null;

  return (
    <div
      className="rounded-[2rem] border border-dashed border-[#5B3A29]/20 bg-[#FFFDF8]/75 px-5 py-14 text-center sm:px-6 sm:py-16"
      data-testid="catalogo-vacio"
    >
      <span
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2F4B3B]/10 text-[#2F4B3B]"
        aria-hidden="true"
      >
        <Icono nombre="brujula" className="h-8 w-8" />
      </span>

      <h3 className="mt-6 text-xl font-black tracking-tight text-[#233128] sm:text-[1.35rem]">
        {soloCategoria
          ? "No encontramos atractivos turísticos disponibles en esta categoría."
          : hayFiltros
            ? "No encontramos atractivos con esos filtros."
            : "Todavía no hay destinos registrados."}
      </h3>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#514B43]">
        {soloCategoria ? (
          <>
            Aún no tenemos favoritos de{" "}
            <span className="font-bold text-[#8D4F32]">{categoria}</span> en el
            catálogo. Prueba con otra categoría o vuelve a ver todos los
            atractivos disponibles.
          </>
        ) : hayFiltros ? (
          "Ningún destino coincide con la búsqueda y los filtros seleccionados. Prueba a quitar alguno, cambiar la zona o ajustar el precio para ampliar los resultados."
        ) : (
          "El catálogo se está preparando. Vuelve en unos momentos para conocer los próximos destinos turísticos de La Paz."
        )}
      </p>

      {hayFiltros && (
        <button
          type="button"
          onClick={onLimpiar}
          className="mt-7 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-[#9A5B3C] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
        >
          {soloCategoria
            ? "Ver todos los destinos"
            : "Quitar todos los filtros"}
          <Icono nombre="flecha" className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {!hayFiltros && (
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#8A8177]">
          La Paz se vive · 6 categorías · Cultura · Miradores · Naturaleza · Gastronomía
        </p>
      )}
    </div>
  );
}
