/**
 * Tabla de horario de atención del destino.
 *
 * Consume `GET /api/turismo/horarios/` filtrado por `atractivo` en el
 * cliente (el backend no configura filter backends) y siempre muestra los
 * 7 días en orden, aunque el backend devuelva días incompletos.
 */

import { useHorariosDestino } from "../hooks/useTurismo";
import { horariosPorDia } from "../utils/formato";

interface HorarioTablaProps {
  destinoId: string;
}

export function HorarioTabla({ destinoId }: HorarioTablaProps) {
  const { data, isPending, isError } = useHorariosDestino(destinoId);

  return (
    <section
      aria-labelledby="horario-destino"
      className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]"
    >
      <header className="border-b border-[#5B3A29]/15 px-6 py-5">
        <p className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
          <span>03 / Planifica tu visita</span>
          <span className="text-[#8A8177]">Lun — Dom</span>
        </p>

        <h3
          id="horario-destino"
          className="font-display mt-2 text-xl font-black tracking-[-0.03em] text-[#233128]"
        >
          Horario de atención
        </h3>
      </header>

      <div className="px-6 py-5">
        {isPending && <TablaSkeleton filas={4} />}

        {!isPending && isError && (
          <p className="text-sm text-[#8D4F32]">
            No pudimos cargar el horario de este destino.
          </p>
        )}

        {!isPending && !isError && data && data.length === 0 && (
          <p className="text-sm leading-6 text-[#514B43]">
            Este destino aún no tiene un horario de atención registrado.
          </p>
        )}

        {!isPending && !isError && data && data.length > 0 && (
          <>
            <ul className="divide-y divide-[#5B3A29]/[0.07]">
              {horariosPorDia(data).map((horario) => (
                <li
                  key={horario.dia_semana}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="text-sm font-bold text-[#263029]">
                    {horario.etiquetaDia}
                  </span>

                  <span
                    className={[
                      "px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums",
                      horario.cerrado
                        ? "bg-[#F6E8DF] text-[#8D4F32]"
                        : horario.hora_apertura
                          ? "bg-[#EDF2E9] text-[#304A38]"
                          : "bg-[#5B3A29]/[0.06] text-[#8A8177]",
                    ].join(" ")}
                  >
                    {horario.rango}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 border-t border-[#5B3A29]/[0.07] pt-4 text-xs leading-5 text-[#8A8177]">
              Los horarios pueden variar en feriados y días especiales.
              Confirma tu visita antes de desplazarte.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** Filas grises mientras llegan los horarios. */
function TablaSkeleton({ filas }: { filas: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando horario de atención…</span>

      {Array.from({ length: filas }).map((_, indice) => (
        <div
          key={indice}
          className="flex items-center justify-between gap-4 border-b border-[#5B3A29]/[0.05] py-3 last:border-0"
        >
          <div className="h-3.5 w-24 animate-pulse bg-[#5B3A29]/[0.09]" />
          <div className="h-6 w-28 animate-pulse bg-[#5B3A29]/[0.09]" />
        </div>
      ))}
    </div>
  );
}
