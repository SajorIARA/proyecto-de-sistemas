/**
 * Panel único de fuentes — ruta `/mi-cuenta/fuentes`.
 *
 * Flujo completo, sin salir de la pantalla: buscar en fuentes abiertas →
 * revisar candidatos con procedencia → aprobar/rechazar → vectorizar →
 * verificar que el RAG devuelve citas reales.
 *
 * Protección de tres capas, igual que el resto del admin: `RoleRoute` en el
 * router, `enabled: esAdmin` en los hooks y `IsAdmin` en el backend (403).
 * El frontend no consulta Overpass, Wikidata ni Google: solo este backend.
 */

import { useEffect, useRef, useState } from "react";

import { PrivateShell } from "../../../cuenta/components/PrivateShell";
import {
  useAprobarCandidato,
  useCandidatosImportacion,
  useCrearImportacion,
  useImportacionesAdmin,
  useRechazarCandidato,
  useVectorizarImportacion,
} from "../hooks/useImportacionesAdmin";
import { FormularioImportacion } from "../components/FormularioImportacion";
import { ListaImportaciones } from "../components/ListaImportaciones";
import { TablaCandidatos } from "../components/TablaCandidatos";

export function FuentesAdminPage() {
  const importaciones = useImportacionesAdmin();
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  // Al cargar el historial, selecciona la importación más reciente.
  useEffect(() => {
    if (seleccionada || !importaciones.data?.length) {
      return;
    }
    setSeleccionada(importaciones.data[0].id_importacion);
  }, [importaciones.data, seleccionada]);

  const candidatos = useCandidatosImportacion(seleccionada);
  const crear = useCrearImportacion();
  const aprobar = useAprobarCandidato();
  const rechazar = useRechazarCandidato();
  const vectorizar = useVectorizarImportacion();

  const importacionSeleccionada =
    importaciones.data?.find((item) => item.id_importacion === seleccionada) ?? null;
  const estadoAnterior = useRef<string | null>(null);

  useEffect(() => {
    const estadoActual = importacionSeleccionada?.estado ?? null;
    if (
      estadoAnterior.current === "pendiente" &&
      estadoActual !== null &&
      estadoActual !== "pendiente"
    ) {
      void candidatos.refetch();
    }
    estadoAnterior.current = estadoActual;
  }, [candidatos.refetch, importacionSeleccionada?.estado]);

  async function alCrear(payload: Parameters<typeof crear.crear>[0]) {
    const resultado = await crear.crear(payload);
    if (resultado) {
      setSeleccionada(resultado.id_importacion);
    }
  }

  const accionError =
    aprobar.error ?? rechazar.error ?? vectorizar.error ?? null;

  return (
    <PrivateShell
      eyebrow="Administración"
      titulo="Fuentes y conocimiento"
      descripcion="Descubrí lugares en fuentes abiertas, revisá su procedencia, aprobá los candidatos y generá embeddings con citas verificables. Google Maps solo se usa como enlace externo: nunca se extrae ni se indexa."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-xl font-black text-[var(--color-text)]">
            Nueva importación
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Overpass (OpenStreetMap) y Wikidata, consultados por el backend.
          </p>
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <FormularioImportacion
              crear={alCrear}
              pendiente={crear.pendiente}
              error={crear.error}
              apiError={crear.apiError}
            />
          </div>

          <div className="mt-8">
            <ListaImportaciones
              importaciones={importaciones.data ?? []}
              seleccionada={seleccionada}
              cargando={importaciones.isPending}
              error={
                importaciones.isError
                  ? "No pudimos cargar el historial. Verificá tu sesión de administrador."
                  : null
              }
              onSeleccionar={setSeleccionada}
            />
          </div>
        </div>

        <TablaCandidatos
          importacion={importacionSeleccionada}
          candidatos={candidatos.data ?? []}
          cargando={candidatos.isPending}
          error={
            candidatos.isError
              ? "No pudimos cargar los candidatos de esta importación."
              : null
          }
          apiError={aprobar.apiError}
          aprobando={aprobar.pendiente}
          rechazando={rechazar.pendiente}
          vectorizando={vectorizar.pendiente}
          accionError={accionError}
          onAprobar={aprobar.aprobar}
          onRechazar={rechazar.rechazar}
          onVectorizar={vectorizar.vectorizar}
        />
      </div>
    </PrivateShell>
  );
}
