/**
 * Sello cuadrado de afinidad de una recomendación.
 *
 * El porcentaje ya viene calculado desde `puntaje` (0–1). El sello es
 * decorativo; el número y la etiqueta son el contenido accesible, de modo
 * que el dato no depende del color ni del relleno de la barra.
 */

function acotar(porcentaje: number): number {
  if (!Number.isFinite(porcentaje)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(porcentaje), 0), 100);
}

interface AnilloAfinidadProps {
  porcentaje: number;
  className?: string;
}

export function AnilloAfinidad({
  porcentaje,
  className = "",
}: AnilloAfinidadProps) {
  const valor = acotar(porcentaje);

  return (
    <div
      className={`relative flex h-24 w-24 shrink-0 flex-col justify-between overflow-hidden border border-[#233128] bg-[#233128] p-3 text-[#F3EBDD] ${className}`}
      role="img"
      aria-label={`${valor} % de afinidad con tu perfil`}
    >
      <p className="font-mono text-[7px] font-bold uppercase tracking-[0.18em] text-[#E8C16A]">
        Afinidad
      </p>

      <p className="font-display text-[2rem] font-black leading-none tabular-nums tracking-[-0.04em]">
        {valor}
        <span className="ml-0.5 font-mono text-[0.65rem] font-bold tracking-normal text-[#E8C16A]">
          %
        </span>
      </p>

      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1 bg-[#F3EBDD]/15"
      >
        <span
          className="block h-full bg-[#C6923B] transition-[width] duration-700"
          style={{ width: `${valor}%` }}
        />
      </span>
    </div>
  );
}
