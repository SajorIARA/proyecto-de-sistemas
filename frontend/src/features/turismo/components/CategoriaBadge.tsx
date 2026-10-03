/**
 * Chip de categoría sobre la fotografía de la card.
 * Usa los colores de identidad de `index.css` (ochre/terracotta) y una
 * insignia por categoría para reforzar la lectura visual.
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
      className={`inline-flex items-center gap-2 rounded-full border border-[#F3EBDD]/35 bg-[#263029]/55 px-3 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#F3EBDD] backdrop-blur-md ${className}`}
    >
      <span aria-hidden="true">{INSIGNIA_CATEGORIA[categoria] ?? "📍"}</span>
      {categoria}
    </span>
  );
}
