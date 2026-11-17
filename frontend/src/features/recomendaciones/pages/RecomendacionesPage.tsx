/**
 * Pantalla de recomendaciones personalizadas — `/mi-cuenta/recomendaciones`.
 *
 * Flujo:
 *
 * 1. Precarga el perfil con la última consulta guardada (o con el borrador
 *    local de preferencias si todavía no hay ninguna).
 * 2. Calcula el Top-K con `POST /api/recomendaciones/recomendar/`.
 * 3. Permite ajustar presupuesto, duración, radio y Top-K y recalcular.
 * 4. Muestra las tarjetas ordenadas por afinidad con costos en BOB y la
 *    estimación de traslado ida y vuelta.
 * 5. Mantiene abierto el asistente con el contexto del ranking actual.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { PrivateShell } from "../../cuenta/components/PrivateShell";
import { usePreferencias } from "../../preferencias/context/PreferenciasContext";
import { useUltimaConsulta } from "../../preferencias/hooks/usePreferencias";
import { AsistenteChat } from "../components/AsistenteChat";
import { ListaRecomendaciones } from "../components/ListaRecomendaciones";
import { PanelPerfil } from "../components/PanelPerfil";
import { useRecomendar } from "../hooks/useRecomendar";
import type { PerfilBusqueda } from "../../../types/recomendaciones";
import {
  ampliarRadio,
  construirRecomendacionInput,
  perfilInicial,
} from "../utils/perfil";

export function RecomendacionesPage() {
  const { borrador } = usePreferencias();
  const consulta = useUltimaConsulta();
  const {
    resultado,
    recomendar,
    pendiente,
    error,
    apiError,
  } = useRecomendar();

  const [perfilManual, setPerfilManual] = useState<PerfilBusqueda | null>(null);
  const inicializado = useRef(false);

  const perfilBase = useMemo(
    () => perfilInicial(consulta.data ?? null, borrador),
    [consulta.data, borrador],
  );
  const perfil = perfilManual ?? perfilBase;

  function consultarCon(destino: PerfilBusqueda) {
    setPerfilManual(destino);
    recomendar(construirRecomendacionInput(destino));
  }

  // Primera carga: espera a conocer la última consulta guardada para no
  // pedir el ranking dos veces con perfiles distintos.
  useEffect(() => {
    if (inicializado.current || consulta.isLoading) {
      return;
    }

    inicializado.current = true;
    recomendar(construirRecomendacionInput(perfilBase));
  }, [consulta.isLoading, perfilBase, recomendar]);

  function actualizarRanking() {
    consultarCon(perfil);
  }

  function ampliarRadioBusqueda() {
    consultarCon({ ...perfil, radioKm: ampliarRadio(perfil.radioKm) });
  }

  const esperandoPerfil = consulta.isLoading && resultado === null;
  const errorDePerfil = apiError?.mensajesDe("punto_partida")[0];

  return (
    <PrivateShell
      eyebrow="Recomendaciones"
      titulo="Tu viaje, a tu medida"
      descripcion="Explora los destinos que mejor encajan con tus intereses, tu presupuesto y el tiempo que tenés. Afinidad, costos en bolivianos y traslados estimados en una sola vista."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="min-w-0 space-y-6">
          <PanelPerfil
            perfil={perfil}
            onCambiar={setPerfilManual}
            onActualizar={actualizarRanking}
            pendiente={pendiente}
          />

          {consulta.isError && (
            <p
              role="status"
              className="rounded-2xl border border-[#C6923B]/25 bg-[#C6923B]/[0.08] px-4 py-3 text-xs leading-6 text-[#7A5A1E]"
            >
              No pudimos leer tu última consulta guardada. Partimos de tu
              borrador local; podés ajustar el perfil arriba y recalcular.
            </p>
          )}

          {errorDePerfil && (
            <p
              role="alert"
              className="rounded-2xl border border-[#9A5B3C]/25 bg-[#9A5B3C]/[0.06] px-4 py-3 text-xs leading-6 text-[#8D4F32]"
            >
              {errorDePerfil}
            </p>
          )}

          {resultado && (
            <p className="rounded-2xl border border-[#5B3A29]/[0.08] bg-[#FFFDF8]/70 px-4 py-3 text-xs leading-6 text-[#746D63]">
              Revisamos{" "}
              <strong className="font-black text-[#233128]">
                {resultado.total_evaluados}
              </strong>{" "}
              atractivos activos en un radio de{" "}
              <strong className="font-black text-[#233128]">
                {resultado.radio_km} km
              </strong>{" "}
              desde {perfil.macrodistrito || "tu punto de partida"}.
            </p>
          )}

          <ListaRecomendaciones
            resultado={resultado}
            pendiente={pendiente || esperandoPerfil}
            error={error}
            onActualizar={actualizarRanking}
            onAmpliarRadio={ampliarRadioBusqueda}
            siguienteRadioKm={ampliarRadio(perfil.radioKm)}
          />
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6">
          <AsistenteChat
            recomendaciones={resultado?.recomendaciones ?? []}
            perfil={perfil}
          />
        </aside>
      </div>
    </PrivateShell>
  );
}
