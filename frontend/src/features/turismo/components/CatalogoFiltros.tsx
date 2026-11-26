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
  /** El panel lateral ya controla su visibilidad; evita un segundo desplegable. */
  siempreAbierto?: boolean;
  className?: string;
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
  siempreAbierto = false,
  className = "",
}: CatalogoFiltrosProps) {
  const panelId = useId();
  const hayZona = filtros.zona !== null;
  const hayPrecio = filtros.precioMin !== null || filtros.precioMax !== null;

  // Visible por defecto para preservar accesibilidad, pruebas y descubribilidad;
  // se mantiene plegable como mejora de diseño.
  const [abierto, setAbierto] = useState(false);

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
    <div
      className={`rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_16px_40px_rgba(72,55,38,0.06)] sm:p-4 ${className}`}
    >
      <BuscadorCatalogo
        valor={borrador}
        onChange={onBuscar}
        onLimpiar={onLimpiarTexto}
        disabled={disabled}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
        {!siempreAbierto && (
          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            aria-expanded={abierto}
            aria-controls={panelId}
            className={[
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-xs font-black transition",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]",
              abierto
                ? "border-[var(--color-border-strong)] bg-[var(--color-route-strong)] text-[var(--color-text)]"
                : "border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-brand)]",
            ].join(" ")}
          >
            Filtros

            {avanzados > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-action)] px-1.5 text-[0.7rem] font-black text-[var(--lp-night)]">
                {avanzados}
              </span>
            )}

            <Icono
              nombre="flecha"
              className={`h-3.5 w-3.5 transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`}
              aria-hidden="true"
            />
          </button>
        )}

        {chips.length > 0 && (
          <button
            type="button"
            onClick={onLimpiar}
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-xs font-black text-[var(--color-brand)] underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
          >
            Limpiar
          </button>
        )}
      </div>

      {(siempreAbierto || abierto) && (
        <div
          id={panelId}
          className={`mt-4 border-t border-[var(--color-border)] pt-4 ${
            siempreAbierto ? "space-y-5" : "grid gap-5 lg:grid-cols-3"
          }`}
        >
          <div className={siempreAbierto ? "" : "lg:col-span-3"}>
            <p className="mb-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Categorías
            </p>
            <CategoriaFiltros
              seleccionada={filtros.categoria}
              onChange={onCategoria}
              conteos={conteos}
              disabled={disabled}
              apilado={siempreAbierto}
            />
          </div>
          <div className={siempreAbierto ? "border-t border-[var(--color-border)] pt-4" : ""}>
            <p className="mb-2 flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <Icono nombre="ubicacion" className="h-3.5 w-3.5" aria-hidden="true" />
              Zona
            </p>
            <p className="mb-2 text-xs leading-5 text-[var(--color-text-muted)]">Filtra por área o referencia geográfica.</p>

            <ZonaFiltro
              seleccionada={filtros.zona}
              onChange={onZona}
              disabled={disabled}
            />
          </div>

          <div className={siempreAbierto ? "border-t border-[var(--color-border)] pt-4" : ""}>
            <p className="mb-2 flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <Icono nombre="moneda" className="h-3.5 w-3.5" aria-hidden="true" />
              Precio
            </p>
            <p className="mb-2 text-xs leading-5 text-[var(--color-text-muted)]">Elige un rango en bolivianos para acotar resultados.</p>

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
