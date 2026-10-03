/**
 * Espacio reservado para el mapa del destino.
 *
 * El PO pide "mapa estático/interactivo con su coordenada PostGIS", pero
 * el mapa se encarga el backend y queda fuera de este sprint. Por eso
 * aquí NO se integra ninguna librería de mapas: se reserva el layout, se
 * muestran las coordenadas reales que llegan de PostGIS
 * (`Atractivo.ubicacion` → `{longitud, latitud}`) y se deja el hueco
 * listo para montar el mapa cuando exista.
 *
 * Cuando el backend exponga la URL del mapa o las coordenadas enrichecidas,
 * basta con reemplazar el cuerpo de este componente.
 */

import type { Coordenada } from "../../../types/turismo";
import { formatearCoordenadas } from "../utils/formato";

interface MapaDestinoProps {
  ubicacion: Coordenada | null;
  nombreDestino: string;
}

export function MapaDestino({ ubicacion, nombreDestino }: MapaDestinoProps) {
  const hayCoordenada = Boolean(ubicacion);

  return (
    <section
      aria-labelledby="mapa-destino"
      className="overflow-hidden rounded-[1.85rem] border border-[#5B3A29]/10 bg-[#FFFDF8]"
    >
      <header className="flex items-center justify-between gap-4 border-b border-[#5B3A29]/[0.08] px-6 py-5">
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#9A5B3C]">
            Ubicación
          </p>

          <h3
            id="mapa-destino"
            className="mt-1 text-lg font-black tracking-tight text-[#233128]"
          >
            Cómo llegar
          </h3>
        </div>

        <span
          className="shrink-0 rounded-full border border-[#C6923B]/30 bg-[#C6923B]/12 px-3 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#8D4F32]"
        >
          Mapa pendiente
        </span>
      </header>

      {/* Hueco reservado para el mapa interactivo */}
      <div
        className="relative flex min-h-[19rem] flex-col items-center justify-center overflow-hidden bg-[#E9DFC9] px-6 py-12 text-center"
        data-testid="mapa-placeholder"
      >
        {/* Textura de mapa en tonos de la identidad */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(47,75,59,.55) 1px, transparent 1px),
              linear-gradient(90deg, rgba(47,75,59,.55) 1px, transparent 1px)
            `,
            backgroundSize: "46px 46px",
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(198,146,59,.28), transparent 60%)",
          }}
          aria-hidden="true"
        />

        <span
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#2F4B3B] text-2xl shadow-[0_14px_34px_rgba(47,75,59,0.35)]"
          aria-hidden="true"
        >
          📍
        </span>

        <p className="relative z-10 mt-5 max-w-sm text-sm font-bold leading-6 text-[#263029]">
          El mapa interactivo de {nombreDestino} se habilitará en la próxima
          entrega.
        </p>

        <p className="relative z-10 mt-2 text-xs leading-5 text-[#514B43]">
          La coordenada PostGIS del destino ya está disponible y se muestra
          lista para el mapa.
        </p>

        {/* Coordenadas reales del backend */}
        <div className="relative z-10 mt-6 rounded-full border border-[#5B3A29]/12 bg-[#FFFDF8]/85 px-5 py-2.5 backdrop-blur">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#8D4F32]">
            Coordenadas
          </p>

          <p className="mt-1 font-mono text-sm font-bold tabular-nums text-[#233128]">
            {formatearCoordenadas(ubicacion)}
          </p>
        </div>

        {!hayCoordenada && (
          <p className="relative z-10 mt-4 text-xs font-semibold text-[#8A8177]">
            Este destino aún no tiene coordenada registrada.
          </p>
        )}
      </div>
    </section>
  );
}
