/**
 * Revisión admin de los lugares descubiertos.
 *
 * Cada fila muestra la proveniencia (fuente, id externo, URL, licencia y hash)
 * y los datos que la fuente **no** declaró como «No verificado». Aprobar
 * exige completar categoría y duración; el backend crea destino + fuente +
 * fragmentos y encola embeddings. Rechazar no publica nada.
 */

import { useState } from "react";

import { Button } from "../../../../design-system/components/Button";
import { CampoTexto, claseInput } from "../../../turismo/admin/components/CampoTexto";
import type { ImportacionLugares, LugarCandidato } from "../../../../types/conocimiento";
import type { ImportacionesAdminApiError } from "../api/importacionesAdminApi";

interface Props {
  importacion: ImportacionLugares | null;
  candidatos: LugarCandidato[];
  cargando: boolean;
  error: string | null;
  apiError: ImportacionesAdminApiError | null;
  aprobando: boolean;
  rechazando: boolean;
  vectorizando: boolean;
  accionError: string | null;
  onAprobar: (
    id: string,
    payload: { categoria: string; duracion_minutos: number },
  ) => Promise<boolean>;
  onRechazar: (id: string, notas: string) => Promise<boolean>;
  onVectorizar: (id: string) => Promise<boolean>;
}

const NO_VERIFICADO = "No verificado";

export function TablaCandidatos({
  importacion,
  candidatos,
  cargando,
  error,
  apiError,
  aprobando,
  rechazando,
  vectorizando,
  accionError,
  onAprobar,
  onRechazar,
  onVectorizar,
}: Props) {
  const [revisiones, setRevisiones] = useState<
    Record<string, { categoria: string; duracion: string; notas: string }>
  >({});

  function revisionDe(candidato: LugarCandidato) {
    return (
      revisiones[candidato.id_candidato] ?? {
        categoria: candidato.categoria || candidato.categoria_sugerida,
        duracion: candidato.duracion_minutos
          ? String(candidato.duracion_minutos)
          : "",
        notas: candidato.notas_revision ?? "",
      }
    );
  }

  function actualizar(
    candidato: LugarCandidato,
    campo: "categoria" | "duracion" | "notas",
    valor: string,
  ) {
    setRevisiones((actuales) => ({
      ...actuales,
      [candidato.id_candidato]: { ...revisionDe(candidato), [campo]: valor },
    }));
  }

  const puedeVectorizar =
    Boolean(importacion) &&
    candidatos.some((candidato) => candidato.estado === "aprobado");

  return (
    <section aria-labelledby="candidatos-titulo" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="candidatos-titulo"
          className="text-xl font-black text-[var(--color-text)]"
        >
          Candidatos para revisar
        </h2>
        {importacion && (
          <Button
            type="button"
            variante="secondary"
            disabled={!puedeVectorizar || vectorizando}
            onClick={() => void onVectorizar(importacion.id_importacion)}
          >
            {vectorizando ? "Encolando…" : "Vectorizar aprobados"}
          </Button>
        )}
      </div>

      {importacion?.estado_vectorizacion === "pendiente" && (
        <p className="mt-2 text-sm font-semibold text-[var(--color-brand)]">
          Vectorización pendiente. Actualizando el estado automáticamente…
        </p>
      )}
      {importacion?.estado_vectorizacion === "error" && (
        <p className="mt-2 text-sm font-semibold text-[var(--color-danger)]" role="alert">
          La vectorización falló: {importacion.error_vectorizacion || "sin detalle"}.
          Corregí el servicio de embeddings y volvé a encolarla.
        </p>
      )}
      {importacion?.estado_vectorizacion === "completado" && (
        <p className="mt-2 text-sm font-semibold text-[var(--color-success)]">
          Embeddings listos: las respuestas RAG pueden citar estas fuentes.
        </p>
      )}
      {accionError && (
        <p className="mt-2 text-sm font-semibold text-[var(--color-danger)]" role="alert">
          {accionError}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm font-semibold text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {cargando && (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Cargando candidatos…
        </p>
      )}
      {!cargando && importacion && candidatos.length === 0 && !error && (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Esta importación no encontró candidatos nuevos. Probá otra búsqueda.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {candidatos.map((candidato) => {
          const revision = revisionDe(candidato);
          const duracion = Number(revision.duracion);
          const incompleto = !revision.categoria.trim() || !Number.isInteger(duracion) || duracion < 1;
          const erroresCategoria = apiError?.mensajesDe("categoria") ?? [];
          const erroresDuracion = apiError?.mensajesDe("duracion_minutos") ?? [];
          return (
            <article
              key={candidato.id_candidato}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[var(--color-text)]">
                    {candidato.nombre}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {candidato.fuente} · {candidato.id_externo} ·{" "}
                    {candidato.licencia || NO_VERIFICADO}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-brand)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--color-brand)]">
                  {candidato.estado}
                </span>
              </header>

              <dl className="mt-3 grid gap-2 text-xs text-[var(--color-text)] sm:grid-cols-2">
                <div>
                  <dt className="font-bold">Descripción declarada</dt>
                  <dd>{candidato.descripcion || "No disponible en la fuente."}</dd>
                </div>
                <div>
                  <dt className="font-bold">Dirección</dt>
                  <dd>{candidato.direccion || NO_VERIFICADO}</dd>
                </div>
                <div>
                  <dt className="font-bold">Horario</dt>
                  <dd>{candidato.horario_declarado || NO_VERIFICADO}</dd>
                </div>
                <div>
                  <dt className="font-bold">Sitio web</dt>
                  <dd>{candidato.sitio_web || NO_VERIFICADO}</dd>
                </div>
                <div>
                  <dt className="font-bold">Categoría sugerida</dt>
                  <dd>{candidato.categoria_sugerida || NO_VERIFICADO}</dd>
                </div>
                <div>
                  <dt className="font-bold">Ubicación</dt>
                  <dd>
                    {candidato.latitud !== null && candidato.longitud !== null
                      ? `${candidato.latitud}, ${candidato.longitud}`
                      : NO_VERIFICADO}
                  </dd>
                </div>
              </dl>

              {candidato.url_fuente && (
                <p className="mt-3 text-xs">
                  <a
                    href={candidato.url_fuente}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-brand)] underline"
                  >
                    Ver registro original ↗
                  </a>
                  <span className="ml-2 font-data text-[var(--color-text-muted)]">
                    {candidato.hash_contenido.slice(0, 12)}
                  </span>
                </p>
              )}

              {candidato.estado === "pendiente" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <CampoTexto
                    id={`categoria-${candidato.id_candidato}`}
                    etiqueta="Categoría revisada"
                    error={erroresCategoria}
                    obligatorio
                  >
                    <input
                      id={`categoria-${candidato.id_candidato}`}
                      value={revision.categoria}
                      onChange={(evento) =>
                        actualizar(candidato, "categoria", evento.target.value)
                      }
                      className={claseInput(erroresCategoria.length > 0)}
                      maxLength={100}
                    />
                  </CampoTexto>
                  <CampoTexto
                    id={`duracion-${candidato.id_candidato}`}
                    etiqueta="Duración (minutos)"
                    error={erroresDuracion}
                    obligatorio
                  >
                    <input
                      id={`duracion-${candidato.id_candidato}`}
                      type="number"
                      min={1}
                      max={10080}
                      value={revision.duracion}
                      onChange={(evento) =>
                        actualizar(candidato, "duracion", evento.target.value)
                      }
                      className={claseInput(erroresDuracion.length > 0)}
                    />
                  </CampoTexto>
                  <div className="sm:col-span-2">
                    <CampoTexto
                      id={`notas-${candidato.id_candidato}`}
                      etiqueta="Motivo del rechazo (opcional)"
                      pista="Queda registrado en el candidato; no se publica en el catálogo."
                      contador={`${revision.notas.length} / 2000`}
                    >
                      <textarea
                        id={`notas-${candidato.id_candidato}`}
                        value={revision.notas}
                        onChange={(evento) =>
                          actualizar(candidato, "notas", evento.target.value)
                        }
                        rows={3}
                        maxLength={2000}
                        className={claseInput(false)}
                      />
                    </CampoTexto>
                  </div>
                  <div className="flex flex-wrap gap-3 sm:col-span-2">
                    <Button
                      type="button"
                      disabled={aprobando || incompleto}
                      onClick={() =>
                        void onAprobar(candidato.id_candidato, {
                          categoria: revision.categoria.trim(),
                          duracion_minutos: duracion,
                        })
                      }
                    >
                      {aprobando ? "Aprobando…" : "Aprobar y publicar"}
                    </Button>
                    <Button
                      type="button"
                      variante="secondary"
                      disabled={rechazando}
                      onClick={() =>
                        void onRechazar(candidato.id_candidato, revision.notas.trim())
                      }
                    >
                      {rechazando ? "Rechazando…" : "Rechazar"}
                    </Button>
                  </div>
                </div>
              )}

              {candidato.estado === "aprobado" && (
                <p className="mt-4 text-xs font-semibold text-[var(--color-success)]">
                  Aprobado · publicado como destino {candidato.duracion_minutos ?? "—"}{" "}
                  min {candidato.categoria ? `· ${candidato.categoria}` : ""}
                </p>
              )}
              {candidato.estado === "rechazado" && (
                <p className="mt-4 text-xs font-semibold text-[var(--color-danger)]">
                  Rechazado {candidato.notas_revision ? `· ${candidato.notas_revision}` : ""}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
