/**
 * Buscador de texto del catálogo (nombre, palabra clave o dirección).
 *
 * Es un input controlado: el valor lo posee el llamador, que lo debouncea antes
 * de tocar la URL. Incluye un botón para limpiar cuando hay texto, de modo que
 * volver al catálogo completo sea un solo clic.
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
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Buscar destinos por nombre, palabra clave o dirección
      </label>

      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#746D63]"
        aria-hidden="true"
      >
        <Icono nombre="buscar" className="h-[1.15rem] w-[1.15rem]" />
      </span>

      <input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar por nombre, palabra clave o dirección…"
        className="min-h-12 w-full rounded-full border border-[#5B3A29]/15 bg-[#FFFDF8] py-3 pl-11 pr-[6.5rem] text-[0.95rem] text-[#263029] shadow-[0_10px_30px_rgba(72,55,38,0.06)] transition placeholder:text-[#8A8177] focus:border-[#2F4B3B] focus:outline-none focus:ring-2 focus:ring-[#2F4B3B]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
      />

      {hayTexto && (
        <button
          type="button"
          onClick={onLimpiar}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex min-h-10 items-center rounded-full bg-[#5B3A29]/[0.08] px-3.5 py-2 text-xs font-black text-[#514B43] transition hover:bg-[#5B3A29]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6923B]"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
