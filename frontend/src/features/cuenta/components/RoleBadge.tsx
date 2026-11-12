import type { RolCodigo } from "../../../types/auth";
import { esRolCodigo, ROL_ETIQUETAS } from "../../../types/auth";

/**
 * Etiqueta visual de un rol.
 *
 * ADMIN usa la terracota y TOURIST el andes, los dos colores de la paleta
 * global. Un código desconocido cae en un chip neutro en vez de romper la
 * columna: el backend es la fuente de verdad de los roles y puede crecer.
 */
const ESTILOS: Record<RolCodigo, string> = {
  ADMIN: "border-[#9A5B3C]/30 bg-[#9A5B3C]/12 text-[#8D4F32]",
  TOURIST: "border-[#2F4B3B]/25 bg-[#2F4B3B]/10 text-[#2F4B3B]",
};

const NEUTRO = "border-[#746D63]/25 bg-[#746D63]/10 text-[#514B43]";

export function RoleBadge({
  rol,
  className = "",
}: {
  rol: string;
  className?: string;
}) {
  const conocido = esRolCodigo(rol);
  const codigo: RolCodigo = conocido ? rol : "TOURIST";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.16em] ${
        conocido ? ESTILOS[codigo] : NEUTRO
      } ${className}`}
    >
      {conocido ? ROL_ETIQUETAS[codigo] : rol}
    </span>
  );
}
