/**
 * Historial de importaciones con su estado real de descarga/vectorización.
 *
 * Los estados vienen del backend. No se calcula éxito RAG en el cliente: si
 * Ollama falló, se muestra `error` con el mensaje devuelto por Django.
 */

import type { ImportacionLugares } from "../../../../types/conocimiento";

interface Props {
  importaciones: ImportacionLugares[];
  seleccionada: string | null;
  cargando: boolean;
  error: string | null;
  onSeleccionar: (id: string) => void;
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: "En cola",
  completado: "Completado",
  error: "Error",
  sin_vectorizar: "Sin vectorizar",
};

export function formatearFecha(iso: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!coincidencia) {
    return iso;
  }
  const [, anio, mes, dia, hora, minutos] = coincidencia;
  return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
}

function Estado({ valor }: { valor: string }) {
  const clases =
    valor === "completado"
      ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
      : valor === "error"
        ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
        : "bg-[var(--color-brand)]/10 text-[var(--color-brand)]";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${clases}`}>
      {ETIQUETAS_ESTADO[valor] ?? valor}
    </span>
  );
}

export function ListaImportaciones({
  importaciones,
  seleccionada,
  cargando,
  error,
  onSeleccionar,
}: Props) {
  return (
    <section aria-labelledby="historial-importaciones">
      <h2
        id="historial-importaciones"
        className="text-xl font-black text-[var(--color-text)]"
      >
        Historial de importaciones
      </h2>

      {error && (
        <p className="mt-3 text-sm font-semibold text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}

      {cargando && (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Cargando importaciones…
        </p>
      )}

      {!cargando && importaciones.length === 0 && !error && (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Todavía no hay importaciones. Buscá lugares para empezar.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {importaciones.map((importacion) => {
            const activa = importacion.id_importacion === seleccionada;
            return (
              <li key={importacion.id_importacion}>
                <button
                  type="button"
                  onClick={() => onSeleccionar(importacion.id_importacion)}
                  aria-current={activa ? "true" : undefined}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    activa
                      ? "border-[var(--color-brand)] bg-[var(--color-surface)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brand)]"
                  }`}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-sm font-black text-[var(--color-text)]">
                      {importacion.consulta}
                    </strong>
                    <span className="font-data text-xs text-[var(--color-text-muted)]">
                      {formatearFecha(importacion.fecha_creacion)}
                    </span>
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <Estado valor={importacion.estado} />
                    <Estado valor={importacion.estado_vectorizacion} />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {importacion.ciudad} · {importacion.fuentes.join(", ")}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs text-[var(--color-text-muted)]">
                    {importacion.encontrados} encontrados ·{" "}
                    {importacion.candidatos_creados} candidatos ·{" "}
                    {importacion.duplicados} duplicados
                  </span>
                  {importacion.error && (
                    <span className="mt-2 block text-xs font-semibold text-[var(--color-danger)]">
                      {importacion.error}
                    </span>
                  )}
                  {importacion.error_vectorizacion && (
                    <span className="mt-1 block text-xs font-semibold text-[var(--color-danger)]">
                      Vectorización: {importacion.error_vectorizacion}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
