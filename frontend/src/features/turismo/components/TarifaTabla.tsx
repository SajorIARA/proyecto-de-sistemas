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
      className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]"
    >
      <header className="border-b border-[#5B3A29]/15 px-6 py-5">
        <p className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[#9A5B3C]">
          <span>04 / Información práctica</span>
          <span className="text-[#8A8177]">BOB</span>
        </p>

        <h3
          id="costos-destino"
          className="font-display mt-2 text-xl font-black tracking-[-0.03em] text-[#233128]"
        >
          Costos oficiales
        </h3>
      </header>

      <div className="px-6 py-5">
        {isPending && (
          <div role="status" aria-live="polite">
            <span className="sr-only">Cargando tarifas…</span>
            <div className="h-12 w-full animate-pulse bg-[#5B3A29]/[0.07]" />
            <div className="mt-2 h-12 w-full animate-pulse bg-[#5B3A29]/[0.07]" />
          </div>
        )}

        {!isPending && isError && (
          <p className="text-sm text-[#8D4F32]">
            No pudimos cargar las tarifas de este destino.
          </p>
        )}

        {!isPending && !isError && data && data.length === 0 && (
          <div className="border-l-2 border-[#2F4B3B]/45 bg-[#EDF2E9] px-4 py-4">
            <p className="text-sm leading-6 text-[#304A38]">
              Este destino no tiene tarifas registradas. El ingreso es libre.
            </p>

            <span className="mt-3 inline-flex items-center gap-2 bg-[#2F4B3B] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#FFFDF8]">
              Entrada gratuita
            </span>
          </div>
        )}

        {!isPending && !isError && base && (
          <ul className="space-y-2">
            {[base, ...resto].map((tarifa, indice) => (
              <li
                key={tarifa.id_tarifa}
                className={[
                  "flex items-center justify-between gap-4 px-4 py-3.5 transition",
                  indice === 0
                    ? "bg-[#233128] text-[#FFFDF8]"
                    : "border border-[#5B3A29]/12 bg-[#FFFDF8] text-[#263029]",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
                    {tarifa.tipo_tarifa_nombre}
                  </p>

                  {tarifa.observacion && (
                    <p
                      className={[
                        "mt-0.5 truncate text-xs",
                        indice === 0 ? "text-[#FFFDF8]/70" : "text-[#8A8177]",
                      ].join(" ")}
                    >
                      {tarifa.observacion}
                    </p>
                  )}
                </div>

                <span
                  className={[
                    "shrink-0 font-mono text-sm font-black tabular-nums",
                    indice === 0 ? "text-[#E8C16A]" : "text-[#2F4B3B]",
                  ].join(" ")}
                >
                  {formatearMonto(tarifa.monto, tarifa.moneda)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {base && (
          <p className="mt-5 border-t border-[#5B3A29]/[0.07] pt-4 text-xs leading-5 text-[#8A8177]">
            Montos en bolivianos (BOB). Las tarifas pueden actualizarse sin
            aviso; consulta al momento de tu visita.
          </p>
        )}
      </div>
    </section>
  );
}
