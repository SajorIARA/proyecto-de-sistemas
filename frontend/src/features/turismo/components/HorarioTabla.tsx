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
      className="chuki-info-panel overflow-hidden rounded-[1.85rem] border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <header className="border-b border-[var(--color-border)]/[0.08] px-6 py-5">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[var(--color-brand)]">
          Planifica tu visita
        </p>

        <h3
          id="horario-destino"
          className="mt-1 text-lg font-black tracking-tight text-[var(--color-text)]"
        >
          Horario de atención
        </h3>
      </header>

      <div className="px-6 py-5">
        {isPending && <TablaSkeleton filas={4} />}

        {!isPending && isError && (
          <p className="text-sm text-[var(--color-brand)]">
            No pudimos cargar el horario de este destino.
          </p>
        )}

        {!isPending && !isError && data && data.length === 0 && (
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Este destino aún no tiene un horario de atención registrado.
          </p>
        )}

        {!isPending && !isError && data && data.length > 0 && (
          <>
            <ul className="divide-y divide-[var(--color-border)]/[0.07]">
              {horariosPorDia(data).map((horario) => (
                <li
                  key={horario.dia_semana}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="text-sm font-bold text-[var(--color-text)]">
                    {horario.etiquetaDia}
                  </span>

                  <span
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-black tabular-nums",
                      horario.cerrado
                        ? "bg-[var(--color-action)] text-[var(--color-brand)]"
                        : horario.hora_apertura
                          ? "bg-[var(--color-route-strong)] text-[var(--color-text)]"
                          : "bg-[var(--color-surface-muted)]/[0.06] text-[var(--color-text-muted)]",
                    ].join(" ")}
                  >
                    {horario.rango}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 border-t border-[var(--color-border)]/[0.07] pt-4 text-xs leading-5 text-[var(--color-text-muted)]">
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
          className="flex items-center justify-between gap-4 border-b border-[var(--color-border)]/[0.05] py-3 last:border-0"
        >
          <div className="h-3.5 w-24 animate-pulse rounded-full bg-[var(--color-surface-muted)]/[0.09]" />
          <div className="h-6 w-28 animate-pulse rounded-full bg-[var(--color-surface-muted)]/[0.09]" />
        </div>
      ))}
    </div>
  );
}
