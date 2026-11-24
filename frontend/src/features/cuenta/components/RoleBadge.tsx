import type { RolCodigo } from "../../../types/auth";
import { esRolCodigo, ROL_ETIQUETAS } from "../../../types/auth";

/**
 * Sello del rol de una cuenta.
 *
 * ADMIN usa la terracota y TOURIST el andes, los dos colores de la paleta
 * global. Un código desconocido cae en un sello neutro en vez de romper la
 * columna: el backend es la fuente de verdad de los roles y puede crecer.
 */
const ESTILOS: Record<RolCodigo, string> = {
  ADMIN: "border-[#9A5B3C]/40 bg-[#F6E8DF] text-[#713A2A]",
  TOURIST: "border-[#2F4B3B]/35 bg-[#EDF2E9] text-[#304A38]",
};

const NEUTRO = "border-[#746D63]/30 bg-[#EFEAE0] text-[#514B43]";

/** Sobre el bloque verde de la credencial el sello se invierte. */
const OSCURO = "border-[#E8C16A]/45 bg-transparent text-[#F3D992]";

export function RoleBadge({
  rol,
  className = "",
  tono = "claro",
}: {
  rol: string;
  className?: string;
  tono?: "claro" | "oscuro";
}) {
  const conocido = esRolCodigo(rol);
  const codigo: RolCodigo = conocido ? rol : "TOURIST";

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] ${
        tono === "oscuro"
          ? OSCURO
          : conocido
            ? ESTILOS[codigo]
            : NEUTRO
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 bg-current"
      />
      {conocido ? ROL_ETIQUETAS[codigo] : rol}
    </span>
  );
}
