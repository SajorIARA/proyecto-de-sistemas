/**
 * Lista del Top-K con sus estados de carga, error y vacío.
 *
 * El ranking anterior se conserva mientras se recalcula: el turista nunca
 * pierde de vista sus recomendaciones por pulsar «Actualizar ranking». Si
 * todavía no hay resultados se muestra un esqueleto accesible.
 */

import type { RespuestaRecomendaciones } from "../../../types/recomendaciones";
import { TarjetaRecomendacion } from "./TarjetaRecomendacion";

function horaCorta(iso: string): string {
  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) {
    return "";
  }

  return fecha.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Esqueleto() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      data-testid="lista-recomendaciones-cargando"
    >
      <p className="sr-only">Calculando tus recomendaciones personalizadas…</p>

      {[0, 1, 2].map((indice) => (
        <div
          key={indice}
          aria-hidden="true"
          className="rounded-[1.75rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-full space-y-3">
              <div className="h-5 w-20 animate-pulse rounded-full bg-[#E9DFC9]" />
              <div className="h-7 w-3/5 animate-pulse rounded-lg bg-[#E9DFC9]" />
              <div className="h-4 w-2/5 animate-pulse rounded-full bg-[#F0E7D8]" />
            </div>
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-[#F0E7D8]" />
          </div>

          <div className="mt-6 h-24 animate-pulse rounded-2xl bg-[#F3EBDD]" />
        </div>
      ))}
    </div>
  );
}

interface ListaRecomendacionesProps {
  resultado: RespuestaRecomendaciones | null;
  pendiente: boolean;
  error: string | null;
  onActualizar: () => void;
  onAmpliarRadio: () => void;
  /** Etiqueta del siguiente radio, para el botón del estado vacío. */
  siguienteRadioKm: number;
}

export function ListaRecomendaciones({
  resultado,
  pendiente,
  error,
  onActualizar,
  onAmpliarRadio,
  siguienteRadioKm,
}: ListaRecomendacionesProps) {
  if (error && !resultado) {
    return (
      <div
        role="alert"
        className="rounded-[1.75rem] border border-[#9A5B3C]/25 bg-[#9A5B3C]/[0.06] px-6 py-8 text-center"
      >
        <p className="text-base font-black text-[#8D4F32]">
          No pudimos calcular tus recomendaciones
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6F655B]">
          {error}
        </p>

        <button
          type="button"
          onClick={onActualizar}
          disabled={pendiente}
          className="mt-5 rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#3C5C48] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendiente ? "Reintentando…" : "Reintentar"}
        </button>
      </div>
    );
  }

  if (pendiente && !resultado) {
    return <Esqueleto />;
  }

  if (!resultado) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-[#5B3A29]/20 bg-[#FFFDF8]/60 px-6 py-10 text-center">
        <p className="text-base font-black text-[#233128]">
          Todavía no calculamos tu ranking
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746D63]">
          Revisa tu perfil de búsqueda y pulsa «Actualizar ranking» para ver
          los destinos que mejor encajan contigo.
        </p>
      </div>
    );
  }

  const recomendaciones = resultado.recomendaciones;

  return (
    <section aria-labelledby="titulo-top-k" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="titulo-top-k"
            className="text-xl font-black tracking-tight text-[#233128]"
          >
            Tu Top-K personalizado
          </h2>

          <p
            className="mt-1 text-xs font-semibold text-[#746D63]"
            aria-live="polite"
          >
            {recomendaciones.length === 0
              ? "Sin coincidencias en el radio actual"
              : `${recomendaciones.length} ${
                  recomendaciones.length === 1 ? "destino" : "destinos"
                } ordenados por afinidad`}
            {resultado.generado_en
              ? ` · calculado a las ${horaCorta(resultado.generado_en)}`
              : ""}
          </p>
        </div>

        {pendiente && (
          <p
            className="inline-flex items-center gap-2 rounded-full border border-[#6F8064]/30 bg-[#F1F6F0] px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#496454]"
            role="status"
          >
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#6F8064]/30 border-t-[#496454]"
            />
            Actualizando ranking
          </p>
        )}
      </div>

      {recomendaciones.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-[#5B3A29]/20 bg-[#FFFDF8]/70 px-6 py-10 text-center">
          <p className="text-base font-black text-[#233128]">
            No encontramos destinos dentro de estos límites
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746D63]">
            Probá ampliar el radio de búsqueda a {siguienteRadioKm} km o
            ajustar el presupuesto y la duración del recorrido.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onAmpliarRadio}
              disabled={pendiente}
              className="rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#3C5C48] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ampliar radio a {siguienteRadioKm} km
            </button>

            <button
              type="button"
              onClick={onActualizar}
              disabled={pendiente}
              className="rounded-full border border-[#5B3A29]/20 bg-[#FFFDF8] px-6 py-3 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <ol className="space-y-4">
          {recomendaciones.map((recomendacion, indice) => (
            <li key={recomendacion.id_atractivo}>
              <TarjetaRecomendacion
                recomendacion={recomendacion}
                posicion={indice + 1}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
