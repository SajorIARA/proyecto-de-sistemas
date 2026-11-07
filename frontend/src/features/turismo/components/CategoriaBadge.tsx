/**
 * Chip de categoría sobre la fotografía de la card.
 *
 * Usa los colores de identidad de `index.css` (ocre/terracota) y el mismo
 * juego de iconos de línea que el resto del sitio, en lugar de emojis: así
 * la insignia se ve igual en cualquier sistema operativo.
 */

import { Icono, type NombreIcono } from "../../../components/site/Iconos";

interface CategoriaBadgeProps {
  categoria: string;
  className?: string;
}

/** Icono de línea asociado a cada categoría oficial. */
export const ICONO_CATEGORIA: Record<string, NombreIcono> = {
  Aventura: "montana",
  "Gastronomía": "utensilios",
  Cultura: "museo",
  Miradores: "camara",
  Naturaleza: "hoja",
  "Arqueología": "estrella",
};

/** Insignia reutilizable (badge, filtros y preferencias). */
export function CategoriaIcono({
  categoria,
  className = "h-3.5 w-3.5",
}: {
  categoria: string;
  className?: string;
}) {
  return (
    <Icono
      nombre={ICONO_CATEGORIA[categoria] ?? "ubicacion"}
      className={className}
    />
  );
}

export function CategoriaBadge({ categoria, className = "" }: CategoriaBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[#F3EBDD]/35 bg-[#263029]/55 px-3 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#F3EBDD] backdrop-blur-md ${className}`}
    >
      <CategoriaIcono categoria={categoria} />
      {categoria}
    </span>
  );
}
