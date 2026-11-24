/**
 * Buscador de texto del catálogo (nombre, palabra clave o dirección).
 *
 * Es un input controlado: el valor lo posee el llamador, que lo debouncea
 * antes de tocar la URL. Visualmente se integra en el riel de filtros como
 * una línea de escritura, no como una caja: la búsqueda es el primer gesto
 * de la guía.
 */

import { useId } from "react";
import { Icono } from "../../../components/site/Iconos";

interface BuscadorCatalogoProps {
  valor: string;
  onChange: (valor: string) => void;
  onLimpiar: () => void;
  disabled?: boolean;
}

export function BuscadorCatalogo({
  valor,
  onChange,
  onLimpiar,
  disabled = false,
}: BuscadorCatalogoProps) {
  const id = useId();
  const hayTexto = valor.trim() !== "";

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Buscar destinos por nombre, palabra clave o dirección
      </label>

      <span
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[#9A5B3C]"
        aria-hidden="true"
      >
        <Icono nombre="buscar" className="h-[1.1rem] w-[1.1rem]" />
      </span>

      <input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder="Nombre, calle o palabra clave…"
        className="w-full border-0 border-b border-[#5B3A29]/25 bg-transparent py-3 pl-7 pr-16 text-[0.95rem] font-semibold text-[#233128] transition placeholder:font-normal placeholder:text-[#8A8177] focus:border-[#2F4B3B] focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B] disabled:cursor-not-allowed disabled:opacity-55"
      />

      {hayTexto && (
        <button
          type="button"
          onClick={onLimpiar}
          aria-label="Limpiar búsqueda"
          className="absolute right-0 top-1/2 -translate-y-1/2 pb-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#8D4F32] underline decoration-[#8D4F32]/35 underline-offset-4 transition hover:decoration-[#8D4F32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6923B]"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
