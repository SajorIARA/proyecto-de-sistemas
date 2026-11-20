/**
 * Etiqueta de categoría sobre la fotografía de la ficha.
 *
 * Se resuelve como una pequeña estampa de papel (crema sobre la foto) en
 * lugar de una píldora: mantiene la lectura editorial del catálogo y
 * funciona igual sobre imágenes claras u oscuras.
 */

interface CategoriaBadgeProps {
  categoria: string;
  className?: string;
}

export const INSIGNIA_CATEGORIA: Record<string, string> = {
  Aventura: "🥾",
  "Gastronomía": "🍲",
  Cultura: "🏛️",
  Miradores: "🌄",
  Naturaleza: "🏔️",
  "Arqueología": "🗿",
};

export function CategoriaBadge({ categoria, className = "" }: CategoriaBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 bg-[#F3EBDD]/95 px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#233128] backdrop-blur-sm ${className}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 bg-[#9A5B3C]" aria-hidden="true" />
      {categoria}
    </span>
  );
}
