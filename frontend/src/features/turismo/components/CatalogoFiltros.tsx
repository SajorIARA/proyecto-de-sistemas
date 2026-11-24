/**
 * Riel de filtros combinados del catálogo.
 *
 * Reúne búsqueda, categorías, zona y presupuesto en una columna de guía.
 * Los controles son "tontos": reciben el estado y emiten cambios; el debounce
 * del texto vive en `useFiltrosCatalogo`. Así la cuadrícula no se re-renderiza
 * por cada pulsación.
 *
 * Las secciones llevan un índice numérico y una línea fina en lugar de tarjetas
 * redondeadas, para que el panel se lea como el índice de una publicación.
 *
 * En celular (por debajo de `sm`) zona y precio se agrupan en «Más filtros»
 * plegable para no robarle campo a la búsqueda. En tablet y monitor permanecen
 * siempre visibles. Si la URL llega con zona o precio activos, el panel se
 * abre solo para que el estado sea visible.
 */

import { useId, useState, type ReactNode } from "react";
import { Icono } from "../../../components/site/Iconos";
import { RANGOS_PRECIO_BOB } from "../../../config/turismo";
import type { Facetas, FiltrosCatalogo } from "../../../types/turismo";
import { BuscadorCatalogo } from "./BuscadorCatalogo";
import { CategoriaFiltros } from "./CategoriaFiltros";
import { FiltrosActivos, type ChipFiltroActivo } from "./FiltrosActivos";
import { RangoPrecioFiltro } from "./RangoPrecioFiltro";
import { ZonaFiltro } from "./ZonaFiltro";

interface CatalogoFiltrosProps {
  filtros: FiltrosCatalogo;
  /** Borrador del buscador (texto aún sin debouncear). */
  borrador: string;
  facetas?: Facetas | null;
  disabled?: boolean;
  onBuscar: (valor: string) => void;
  onLimpiarTexto: () => void;
  onCategoria: (categoria: string | null) => void;
  onZona: (zona: string | null) => void;
  onPrecio: (min: number | null, max: number | null) => void;
  onLimpiar: () => void;
}

/** Etiqueta legible del rango de precio activo (preset o personalizado). */
function etiquetaPrecio(min: number | null, max: number | null): string {
  const preset = RANGOS_PRECIO_BOB.find(
    (rango) =>
      rango.min === min &&
      rango.max === max &&
      (rango.min !== null || rango.max !== null),
  );

  if (preset) {
    return preset.etiqueta;
  }

  const inferior = min === null ? "0" : String(min);
  const superior = max === null ? "∞" : String(max);

  return `Bs ${inferior} – ${superior}`;
}

export function CatalogoFiltros({
  filtros,
  borrador,
  facetas = null,
  disabled = false,
  onBuscar,
  onLimpiarTexto,
  onCategoria,
  onZona,
  onPrecio,
  onLimpiar,
}: CatalogoFiltrosProps) {
  const panelId = useId();
  const hayZona = filtros.zona !== null;
  const hayPrecio = filtros.precioMin !== null || filtros.precioMax !== null;
  const avanzados = (hayZona ? 1 : 0) + (hayPrecio ? 1 : 0);

  // Plegable solo en celular; en tablet y monitor `sm:grid` lo fuerza visible.
  const [abierto, setAbierto] = useState(hayZona || hayPrecio);

  const conteos = facetas
    ? Object.fromEntries(
        facetas.categorias.map((categoria) => [
          categoria.nombre,
          categoria.total,
        ]),
      )
    : undefined;

  const chips: ChipFiltroActivo[] = [];

  if (filtros.categoria) {
    chips.push({
      clave: "categoria",
      etiqueta: `Categoría: ${filtros.categoria}`,
      onQuitar: () => onCategoria(null),
    });
  }

  if (filtros.q) {
    chips.push({
      clave: "q",
      etiqueta: `“${filtros.q}”`,
      onQuitar: onLimpiarTexto,
    });
  }

  if (filtros.zona) {
    chips.push({
      clave: "zona",
      etiqueta: `Zona: ${filtros.zona}`,
      onQuitar: () => onZona(null),
    });
  }

  if (hayPrecio) {
    chips.push({
      clave: "precio",
      etiqueta: etiquetaPrecio(filtros.precioMin, filtros.precioMax),
      onQuitar: () => onPrecio(null, null),
    });
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 border-b border-[#5B3A29]/20 pb-4">
        <h2 className="font-display text-2xl font-black tracking-[-0.035em] text-[#233128]">
          Filtrar la guía
        </h2>

        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8177]">
          {typeof facetas?.total_atractivos === "number"
            ? `${String(facetas.total_atractivos).padStart(2, "0")} fichas`
            : "Catálogo"}
        </p>
      </div>

      <section className="mt-6">
        <EtiquetaFiltro numero="01">Buscar</EtiquetaFiltro>
        <BuscadorCatalogo
          valor={borrador}
          onChange={onBuscar}
          onLimpiar={onLimpiarTexto}
          disabled={disabled}
        />
      </section>

      <section className="mt-7 border-t border-[#5B3A29]/12 pt-5">
        <EtiquetaFiltro numero="02">Categoría</EtiquetaFiltro>

        <div className="mt-1">
          <CategoriaFiltros
            seleccionada={filtros.categoria}
            onChange={onCategoria}
            conteos={conteos}
            conteoTotal={facetas?.total_atractivos}
            disabled={disabled}
          />
        </div>
      </section>

      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-controls={panelId}
        className="mt-7 flex w-full items-center justify-between gap-3 border-t border-[#5B3A29]/12 pt-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B] sm:hidden"
      >
        <span className="flex items-baseline gap-3">
          <span className="font-mono text-[9px] tracking-[0.18em] text-[#9A5B3C]">
            03–04
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8A8177]">
            Más filtros
          </span>

          {avanzados > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center bg-[#9A5B3C] px-1 text-[9px] font-black text-[#FFFDF8]">
              {avanzados}
            </span>
          )}
        </span>

        <Icono
          nombre="flecha"
          className={`h-3.5 w-3.5 shrink-0 text-[#8D4F32] transition-transform ${
            abierto ? "-rotate-90" : "rotate-90"
          }`}
        />
      </button>

      <div
        id={panelId}
        className={[
          "gap-6 sm:mt-7 sm:grid sm:grid-cols-2 sm:border-t sm:border-[#5B3A29]/12 sm:pt-5 lg:grid-cols-1",
          abierto ? "mt-5 grid" : "hidden",
        ].join(" ")}
      >
        <section>
          <EtiquetaFiltro numero="03">Dónde</EtiquetaFiltro>
          <div className="mt-2">
            <ZonaFiltro
              seleccionada={filtros.zona}
              onChange={onZona}
              disabled={disabled}
            />
          </div>
        </section>

        <section>
          <EtiquetaFiltro numero="04">Cuánto</EtiquetaFiltro>
          <div className="mt-2">
            <RangoPrecioFiltro
              precioMin={filtros.precioMin}
              precioMax={filtros.precioMax}
              onChange={onPrecio}
              rango={facetas?.precios_bob ?? null}
              disabled={disabled}
            />
          </div>
        </section>
      </div>

      {chips.length > 0 && (
        <div className="mt-7 border-t border-[#5B3A29]/12 pt-5">
          <FiltrosActivos chips={chips} onLimpiar={onLimpiar} />
        </div>
      )}
    </div>
  );
}

function EtiquetaFiltro({
  numero,
  children,
}: {
  numero: string;
  children: ReactNode;
}) {
  return (
    <p className="flex items-baseline gap-3">
      <span className="font-mono text-[9px] tracking-[0.18em] text-[#9A5B3C]">
        {numero}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8A8177]">
        {children}
      </span>
    </p>
  );
}
