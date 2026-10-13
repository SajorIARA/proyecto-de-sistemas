/**
 * Buscador de texto del catálogo (nombre, palabra clave o dirección).
 *
 * Es un input controlado: el valor lo posee el llamador, que lo debouncea antes
 * de tocar la URL. Incluye un botón para limpiar cuando hay texto, de modo que
 * volver al catálogo completo sea un solo clic.
 */

import { useId } from "react";

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
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#8A8177]"
      >
        🔍
      </span>

      <input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        disabled={disabled}
        autoComplete="off"
        placeholder="Buscar por nombre, palabra clave o dirección…"
        className="w-full rounded-full border border-[#5B3A29]/15 bg-[#FFFDF8] py-3 pl-11 pr-28 text-sm text-[#263029] shadow-[0_10px_30px_rgba(72,55,38,0.06)] transition placeholder:text-[#8A8177] focus:border-[#2F4B3B] focus:outline-none focus:ring-2 focus:ring-[#2F4B3B]/20 disabled:cursor-not-allowed disabled:opacity-60"
      />

      {hayTexto && (
        <button
          type="button"
          onClick={onLimpiar}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#5B3A29]/[0.08] px-3 py-1.5 text-xs font-black text-[#514B43] transition hover:bg-[#5B3A29]/15"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
