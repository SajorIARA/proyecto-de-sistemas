import type { RolCodigo } from "../../../types/auth";
import { esRolCodigo, ROL_ETIQUETAS } from "../../../types/auth";

/**
 * Etiqueta visual de un rol.
 *
 * Los roles usan los tokens semánticos globales. Un código desconocido cae
 * en un chip neutro en vez de romper la
 * columna: el backend es la fuente de verdad de los roles y puede crecer.
 */
const ESTILOS: Record<RolCodigo, string> = {
  ADMIN: "border-[var(--color-brand)]/30 bg-[var(--color-surface-muted)] text-[var(--color-action)]",
  TOURIST: "border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 text-[var(--color-brand)]",
};

const NEUTRO =
  "border-[var(--color-border-strong)] bg-[var(--color-canvas)] text-[var(--color-text-muted)]";

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
      className={`inline-flex items-center gap-1.5 border px-3 py-1 text-xs font-black ${
        conocido ? ESTILOS[codigo] : NEUTRO
      } ${className}`}
    >
      {conocido ? ROL_ETIQUETAS[codigo] : rol}
    </span>
  );
}
