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
      className="grid gap-6 border-y border-[#5B3A29]/20 py-14 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10 sm:py-16"
      data-testid="catalogo-vacio"
    >
      <p
        className="font-display text-[5.5rem] font-black leading-[0.8] tracking-[-0.08em] text-[#E9DFC9] sm:text-[7rem]"
        aria-hidden="true"
      >
        00
      </p>

      <div className="max-w-2xl">
        <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
          Sin resultados
        </p>

        <h3 className="mt-3 font-display text-2xl font-black leading-tight tracking-[-0.03em] text-[#233128] sm:text-[1.6rem]">
          {soloCategoria
            ? "No encontramos atractivos turísticos disponibles en esta categoría."
            : hayFiltros
              ? "No encontramos atractivos con esos filtros."
              : "Todavía no hay destinos registrados."}
        </h3>

        <p className="mt-4 text-sm leading-7 text-[#514B43]">
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
            className="mt-7 inline-flex min-h-11 items-center gap-3 border-b-2 border-[#233128] pb-1 text-xs font-black uppercase tracking-[0.16em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
          >
            {soloCategoria
              ? "Ver todos los destinos"
              : "Quitar todos los filtros"}
            <span aria-hidden="true">→</span>
          </button>
        )}

        {!hayFiltros && (
          <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]">
            La Paz se vive · 6 categorías · Cultura · Miradores · Naturaleza · Gastronomía
          </p>
        )}
      </div>
    </div>
  );
}
