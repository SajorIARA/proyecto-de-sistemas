/**
 * Costos oficiales del destino.
 *
 * Consume `GET /api/turismo/tarifas/` filtrado por `atractivo` en el
 * cliente (el backend no configura filter backends). Ordena de más barata
 * a más cara y muestra "Gratuito" cuando el monto es 0, como en el caso
 * de la tarifa ADULTO_MAYOR del Museo de la Calle Jaén.
 */

import { useTarifasDestino } from "../hooks/useTurismo";
import { formatearMonto, ordenarTarifas, tarifaBase } from "../utils/formato";

interface TarifaTablaProps {
  destinoId: string;
}

export function TarifaTabla({ destinoId }: TarifaTablaProps) {
  const { data, isPending, isError } = useTarifasDestino(destinoId);

  const base = tarifaBase(data ?? []);
  const resto = ordenarTarifas(data ?? []).slice(1);

  return (
    <section
      aria-labelledby="costos-destino"
      className="chuki-info-panel overflow-hidden rounded-[1.85rem] border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <header className="border-b border-[var(--color-border)]/[0.08] px-6 py-5">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[var(--color-brand)]">
          Información práctica
        </p>

        <h3
          id="costos-destino"
          className="mt-1 text-lg font-black tracking-tight text-[var(--color-text)]"
        >
          Costos oficiales
        </h3>
      </header>

      <div className="px-6 py-5">
        {isPending && (
          <div role="status" aria-live="polite">
            <span className="sr-only">Cargando tarifas…</span>
            <div className="h-12 w-full animate-pulse rounded-2xl bg-[var(--color-surface-muted)]/[0.07]" />
            <div className="mt-3 h-12 w-full animate-pulse rounded-2xl bg-[var(--color-surface-muted)]/[0.07]" />
          </div>
        )}

        {!isPending && isError && (
          <p className="text-sm text-[var(--color-brand)]">
            No pudimos cargar las tarifas de este destino.
          </p>
        )}

        {!isPending && !isError && data && data.length === 0 && (
          <div>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              Este destino no tiene tarifas registradas. El ingreso es libre.
            </p>

            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-route-strong)] px-4 py-2 text-xs font-black text-[var(--color-text)]">
              Entrada gratuita
            </span>
          </div>
        )}

        {!isPending && !isError && base && (
          <ul className="space-y-2.5">
            {[base, ...resto].map((tarifa, indice) => (
              <li
                key={tarifa.id_tarifa}
                className={[
                  "flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5 transition",
                  indice === 0
                    ? "bg-[var(--color-route-strong)] text-[var(--color-text)]"
                    : "bg-[var(--color-surface-muted)]/[0.04] text-[var(--color-text)]",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {tarifa.tipo_tarifa_nombre}
                  </p>

                  {tarifa.observacion && (
                    <p
                      className={[
                        "mt-0.5 truncate text-xs",
                        indice === 0 ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
                      ].join(" ")}
                    >
                      {tarifa.observacion}
                    </p>
                  )}
                </div>

                <span
                  className={[
                    "shrink-0 font-mono text-sm font-black tabular-nums",
                    indice === 0 ? "text-[var(--color-action)]" : "text-[var(--color-brand)]",
                  ].join(" ")}
                >
                  {formatearMonto(tarifa.monto, tarifa.moneda)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {base && (
          <p className="mt-5 border-t border-[var(--color-border)]/[0.07] pt-4 text-xs leading-5 text-[var(--color-text-muted)]">
            Montos en bolivianos (BOB). Las tarifas pueden actualizarse sin
            aviso; consulta al momento de tu visita.
          </p>
        )}
      </div>
    </section>
  );
}
