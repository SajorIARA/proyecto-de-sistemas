/**
 * Chip de categoría sobre la fotografía de la card.
 * Usa iconografía de línea y los tokens del sistema visual.
 */

import { Icono, type NombreIcono } from "../../../components/site/Iconos";

interface CategoriaBadgeProps {
  categoria: string;
  className?: string;
}

export const ICONO_CATEGORIA: Record<string, NombreIcono> = {
  Aventura: "ruta",
  "Gastronomía": "utensilios",
  Cultura: "museo",
  Miradores: "altitud",
  Naturaleza: "hoja",
  "Arqueología": "montana",
};

export function CategoriaBadge({ categoria, className = "" }: CategoriaBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 border border-white/30 bg-[var(--color-text)]/80 px-3 py-1.5 text-xs font-black text-[var(--lp-night)] backdrop-blur-md ${className}`}
    >
      <Icono nombre={ICONO_CATEGORIA[categoria] ?? "ubicacion"} className="h-4 w-4" />
      {categoria}
    </span>
  );
}
