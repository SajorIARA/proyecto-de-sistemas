/**
 * Anillo de afinidad de una recomendación.
 *
 * El porcentaje ya viene calculado desde `puntaje` (0–1). El anillo es
 * decorativo; el número y la etiqueta son el contenido accesible, de modo
 * que el dato no depende del color ni del trazo.
 */

import { useId } from "react";

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

const RADIO = 30;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export function AnilloAfinidad({
  porcentaje,
  className = "",
}: AnilloAfinidadProps) {
  const id = useId();
  const valor = acotar(porcentaje);
  const desplazamiento = CIRCUNFERENCIA * (1 - valor / 100);

  return (
    <div
      className={`relative grid h-24 w-24 shrink-0 place-items-center ${className}`}
      role="img"
      aria-label={`${valor} % de afinidad con tu perfil`}
    >
      <svg
        viewBox="0 0 72 72"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9A5B3C" />
            <stop offset="100%" stopColor="#C6923B" />
          </linearGradient>
        </defs>

        <circle
          cx="36"
          cy="36"
          r={RADIO}
          fill="none"
          stroke="#E9DFC9"
          strokeWidth="6"
        />

        <circle
          cx="36"
          cy="36"
          r={RADIO}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={desplazamiento}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-xl font-black leading-none tabular-nums text-[#233128]">
          {valor}
          <span className="ml-0.5 text-[0.65rem] font-black text-[#8D4F32]">
            %
          </span>
        </p>
        <p className="mt-1 text-[0.5rem] font-black uppercase tracking-[0.16em] text-[#8A8177]">
          Afinidad
        </p>
      </div>
    </div>
  );
}
