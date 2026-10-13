/**
 * Panel de filtros combinados del catálogo.
 *
 * Reúne el buscador de texto, las categorías (chips), la zona geográfica y el
 * rango de precio en BOB. Todos los controles operan sobre el mismo estado
 * (la URL) y se pueden combinar libremente: p. ej. Categoría "Miradores" +
 * Zona "Centro" dispara una única petición con `categoria=Miradores&zona=Centro`.
 *
 * El componente es "tonto": no conoce la API ni el debounce; recibe el estado y
 * emite cambios. Así el buscador puede teclear sin re-renderizar toda la
 * cuadrícula y el debounce vive en un único sitio (`useFiltrosCatalogo`).
 */

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

  if (filtros.precioMin !== null || filtros.precioMax !== null) {
    chips.push({
      clave: "precio",
      etiqueta: etiquetaPrecio(filtros.precioMin, filtros.precioMax),
      onQuitar: () => onPrecio(null, null),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <BuscadorCatalogo
        valor={borrador}
        onChange={onBuscar}
        onLimpiar={onLimpiarTexto}
        disabled={disabled}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <CategoriaFiltros
          seleccionada={filtros.categoria}
          onChange={onCategoria}
          conteos={conteos}
          disabled={disabled}
        />

        <ZonaFiltro
          seleccionada={filtros.zona}
          onChange={onZona}
          disabled={disabled}
        />
      </div>

      <RangoPrecioFiltro
        precioMin={filtros.precioMin}
        precioMax={filtros.precioMax}
        onChange={onPrecio}
        rango={facetas?.precios_bob ?? null}
        disabled={disabled}
      />

      <FiltrosActivos chips={chips} onLimpiar={onLimpiar} />
    </div>
  );
}
