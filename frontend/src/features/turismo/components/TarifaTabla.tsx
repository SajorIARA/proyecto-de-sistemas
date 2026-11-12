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
      className="overflow-hidden rounded-[1.85rem] border border-[#5B3A29]/10 bg-[#FFFDF8]"
    >
      <header className="border-b border-[#5B3A29]/[0.08] px-6 py-5">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#9A5B3C]">
          Información práctica
        </p>

        <h3
          id="costos-destino"
          className="mt-1 text-lg font-black tracking-tight text-[#233128]"
        >
          Costos oficiales
        </h3>
      </header>

      <div className="px-6 py-5">
        {isPending && (
          <div role="status" aria-live="polite">
            <span className="sr-only">Cargando tarifas…</span>
            <div className="h-12 w-full animate-pulse rounded-2xl bg-[#5B3A29]/[0.07]" />
            <div className="mt-3 h-12 w-full animate-pulse rounded-2xl bg-[#5B3A29]/[0.07]" />
          </div>
        )}

        {!isPending && isError && (
          <p className="text-sm text-[#8D4F32]">
            No pudimos cargar las tarifas de este destino.
          </p>
        )}

        {!isPending && !isError && data && data.length === 0 && (
          <div>
            <p className="text-sm leading-6 text-[#514B43]">
              Este destino no tiene tarifas registradas. El ingreso es libre.
            </p>

            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2F4B3B]/10 px-4 py-2 text-xs font-black text-[#2F4B3B]">
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
                    ? "bg-[#2F4B3B] text-[#FFFDF8]"
                    : "bg-[#5B3A29]/[0.04] text-[#263029]",
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
