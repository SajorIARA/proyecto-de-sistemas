/**
 * Panel de filtros combinados del catálogo.
 *
 * La barra visible reúne el buscador y las categorías. Los filtros menos
 * frecuentes (zona y precio) viven en un desplegable «Más filtros», de modo
 * que la primera pantalla del catálogo queda limpia y el usuario decide
 * cuándo profundizar. Si la URL llega con zona o precio activos, el panel se
 * abre solo para que el estado sea visible.
 *
 * El componente es "tonto": no conoce la API ni el debounce; recibe el estado y
 * emite cambios. Así el buscador puede teclear sin re-renderizar toda la
 * cuadrícula y el debounce vive en un único sitio (`useFiltrosCatalogo`).
 */

import { useId, useState } from "react";
import { RANGOS_PRECIO_BOB } from "../../../config/turismo";
import { Icono } from "../../../components/site/Iconos";
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

  // Abierto si hay un filtro avanzado activo; el usuario puede plegarlo.
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

  const avanzados = (hayZona ? 1 : 0) + (hayPrecio ? 1 : 0);

  return (
    <div className="rounded-[1.75rem] border border-[#5B3A29]/12 bg-[#FFFDF8]/75 p-3 shadow-[0_16px_40px_rgba(72,55,38,0.06)] sm:p-4">
      <BuscadorCatalogo
        valor={borrador}
        onChange={onBuscar}
        onLimpiar={onLimpiarTexto}
        disabled={disabled}
      />

      <div className="mt-3">
        <CategoriaFiltros
          seleccionada={filtros.categoria}
          onChange={onCategoria}
          conteos={conteos}
          disabled={disabled}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#5B3A29]/10 pt-3">
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
          aria-controls={panelId}
          className={[
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black transition",
            "focus-visible:ring-2 focus-visible:ring-[#2F4B3B]/30 focus-visible:outline-none",
            abierto
              ? "border-[#2F4B3B]/35 bg-[#2F4B3B]/10 text-[#2F4B3B]"
              : "border-[#5B3A29]/15 bg-transparent text-[#514B43] hover:border-[#2F4B3B]/35 hover:text-[#2F4B3B]",
          ].join(" ")}
        >
          <Icono nombre="filtros" className="h-4 w-4" />
          Más filtros

          {avanzados > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9A5B3C] px-1.5 text-[0.65rem] font-black text-[#FFFDF8]">
              {avanzados}
            </span>
          )}

          <Icono
            nombre={abierto ? "chevronArriba" : "chevronAbajo"}
            className="h-3.5 w-3.5"
          />
        </button>

        {chips.length > 0 && (
          <button
            type="button"
            onClick={onLimpiar}
            className="rounded-full px-3 py-2 text-xs font-black text-[#8D4F32] underline-offset-4 transition hover:underline focus-visible:ring-2 focus-visible:ring-[#9A5B3C]/30 focus-visible:outline-none"
          >
            Limpiar
          </button>
        )}
      </div>

      {abierto && (
        <div
          id={panelId}
          className="mt-4 grid gap-5 border-t border-[#5B3A29]/10 pt-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]"
        >
          <div>
            <p className="mb-2 flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
              <Icono nombre="ubicacion" className="h-3.5 w-3.5" />
              Zona
            </p>

            <ZonaFiltro
              seleccionada={filtros.zona}
              onChange={onZona}
              disabled={disabled}
            />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#8A8177]">
              <Icono nombre="moneda" className="h-3.5 w-3.5" />
              Precio
            </p>

            <RangoPrecioFiltro
              precioMin={filtros.precioMin}
              precioMax={filtros.precioMax}
              onChange={onPrecio}
              rango={facetas?.precios_bob ?? null}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      <div className="mt-3">
        <FiltrosActivos chips={chips} onLimpiar={onLimpiar} />
      </div>
    </div>
  );
}
