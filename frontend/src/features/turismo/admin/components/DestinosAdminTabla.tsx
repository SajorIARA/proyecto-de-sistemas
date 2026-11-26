/**
 * Listado de destinos del panel de administración: alta, edición, baja y
 * reactivación.
 *
 * Consume `GET /api/turismo/admin/atractivos/`, que **sí incluye los destinos
 * dados de baja** a diferencia del catálogo público. Por eso la tabla tiene un
 * filtro de estado y un botón de "Reactivar": el DELETE del backend es una
 * baja lógica, no un borrado.
 *
 * El buscador y el filtro de estado se resuelven en el cliente porque
 * `AtractivoAdminViewSet` no declara `filter_backends` ni `get_queryset`: no
 * acepta `?q=` ni `?activo=`. Filtrar solo la página actual mentiría cuando
 * haya más de 20 destinos, así que el aviso de la tabla deja claro que el
 * filtro alcanza a lo que se está viendo.
 *
 * `categorias` viene como **ids**, no como nombres: se cruzan contra
 * `/turismo/categorias/` para poder mostrarlos.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_DESTINOS_PAGE_SIZE } from "../../../../config/turismo";
import type {
  AtractivoAdmin,
  Categoria,
  FiltroEstadoDestino,
} from "../../../../types/turismo";
import { formatearDuracion } from "../../utils/formato";
import { useCategorias } from "../../hooks/useTurismo";
import { useCambiarEstadoDestino, useDestinosAdmin } from "../hooks/useDestinosAdmin";
import { filtrarDestinos } from "../utils/destinoForm";

const COLUMNAS = ["Destino", "Categorías", "Duración", "Estado", "Acciones"];

const FILTROS: { valor: FiltroEstadoDestino; etiqueta: string }[] = [
  { valor: "activos", etiqueta: "Activos" },
  { valor: "inactivos", etiqueta: "Dados de baja" },
  { valor: "todos", etiqueta: "Todos" },
];

function FilaSkeleton() {
  return (
    <tr className="border-t border-[var(--color-border)]">
      {COLUMNAS.map((columna) => (
        <td key={columna} className="px-5 py-5">
          <div className="h-3.5 w-full max-w-[9rem] animate-pulse bg-[var(--color-border)]" />
        </td>
      ))}
    </tr>
  );
}

export function DestinosAdminTabla() {
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState<FiltroEstadoDestino>("activos");
  const [texto, setTexto] = useState("");

  const { data, isPending, isError, error, refetch } = useDestinosAdmin(pagina);
  const { data: categorias } = useCategorias();

  const { cambiarEstado, error: errorEstado, pendiente, idEnCurso } =
    useCambiarEstadoDestino();

  const destinos = useMemo(
    () => filtrarDestinos(data?.results ?? [], { estado, texto }),
    [data?.results, estado, texto],
  );

  const nombresCategoria = useMemo(() => {
    const mapa = new Map<number, string>();

    for (const categoria of (categorias ?? []) as Categoria[]) {
      mapa.set(categoria.id_categoria, categoria.nombre);
    }

    return mapa;
  }, [categorias]);

  const totalPaginas = data
    ? Math.max(1, Math.ceil(data.count / ADMIN_DESTINOS_PAGE_SIZE))
    : 1;

  return (
    <section className="lp-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="h-1 w-8 bg-[var(--color-brand)]" aria-hidden="true" />

          <h2 className="text-lg font-black">
            Destinos registrados
          </h2>
        </div>

        {!isPending && !isError && (
          <p className="font-data text-xs text-[var(--color-text-muted)]" aria-live="polite">
            {data?.count ?? 0} {(data?.count ?? 0) === 1 ? "destino" : "destinos"}
          </p>
        )}
      </div>

      {/* =========================================================
          FILTROS
      ========================================================== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.valor}
              type="button"
              onClick={() => setEstado(filtro.valor)}
              aria-pressed={estado === filtro.valor}
              className={`min-h-11 border px-4 py-2 text-xs font-black transition ${
                estado === filtro.valor
                  ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--lp-night)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-brand)]"
              }`}
            >
              {filtro.etiqueta}
            </button>
          ))}
        </div>

        <label htmlFor="buscar-destino" className="sr-only">
          Buscar destino por nombre, descripción o dirección
        </label>

        <input
          id="buscar-destino"
          type="search"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Buscar por nombre o dirección…"
          className="min-h-11 min-w-[14rem] flex-1 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)] transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)]"
        />
      </div>

      {/* =========================================================
          AVISO DE ALCANCE DEL FILTRO
      ========================================================== */}
      {!isPending && !isError && (texto.trim() !== "" || estado !== "activos") && (
        <p className="border-b border-[var(--color-action)]/40 bg-[var(--color-action)]/10 px-6 py-2.5 text-xs text-[var(--color-action)] sm:px-8">
          El filtro se aplica a los destinos de esta página ({destinos.length} de{" "}
          {data?.results.length ?? 0}). El backend no admite búsqueda en el
          listado de administración.
        </p>
      )}

      {/* Error de la operación de baja/reactivación */}
      {errorEstado && (
        <p
          role="alert"
          className="border-b border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-6 py-3 text-sm font-semibold text-[var(--color-danger)] sm:px-8"
        >
          {errorEstado}
        </p>
      )}

      {/* =========================================================
          ESQUELETO DE CARGA
      ========================================================== */}
      {isPending && (
        <>
          <p className="px-6 pt-6 text-sm font-semibold text-[var(--color-text-muted)] sm:px-8" role="status">
            Cargando destinos…
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse">
              <caption className="sr-only">Cargando el listado de destinos</caption>

              <tbody>
                {Array.from({ length: 5 }).map((_, indice) => (
                  <FilaSkeleton key={indice} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* =========================================================
          ERROR
      ========================================================== */}
      {isError && (
        <div className="px-6 py-12 text-center sm:px-8">
          <p role="alert" className="text-sm font-semibold text-[var(--color-danger)]">
            {error instanceof Error ? error.message : "No pudimos cargar los destinos."}
          </p>

          <button
            type="button"
            onClick={() => void refetch()}
            className="lp-button lp-button--secondary mt-5 min-h-11 px-6 py-2.5 text-sm font-black"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* =========================================================
          VACÍO
      ========================================================== */}
      {!isPending && !isError && destinos.length === 0 && (
        <p className="px-6 py-12 text-center text-sm font-semibold text-[var(--color-text-muted)] sm:px-8">
          {texto.trim() !== ""
            ? "Ningún destino coincide con la búsqueda."
            : estado === "activos"
              ? "Todavía no hay destinos activos en el catálogo."
              : estado === "inactivos"
                ? "No hay destinos dados de baja."
                : "Todavía no hay destinos registrados."}
        </p>
      )}

      {/* =========================================================
          TABLA
      ========================================================== */}
      {!isPending && !isError && destinos.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse">
              <caption className="sr-only">
                Destinos registrados con sus categorías, duración, estado y acciones
              </caption>

              <thead>
                <tr className="bg-[var(--color-canvas)]">
                  {COLUMNAS.map((columna) => (
                    <th
                      key={columna}
                      scope="col"
                      className="px-5 py-3.5 text-left text-xs font-black text-[var(--color-brand)]"
                    >
                      {columna}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {destinos.map((destino) => (
                  <Fila
                    key={destino.id_atractivo}
                    destino={destino}
                    nombresCategoria={nombresCategoria}
                    alCambiarEstado={cambiarEstado}
                    procesando={pendiente && idEnCurso === destino.id_atractivo}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <nav
              aria-label="Paginación de destinos"
              className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] px-6 py-5 sm:px-8"
            >
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="lp-button lp-button--secondary min-h-11 px-5 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>

              <p className="font-data text-xs font-bold text-[var(--color-text-muted)]">
                Página {pagina} de {totalPaginas}
              </p>

              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="lp-button lp-button--secondary min-h-11 px-5 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function Fila({
  destino,
  nombresCategoria,
  alCambiarEstado,
  procesando,
}: {
  destino: AtractivoAdmin;
  nombresCategoria: Map<number, string>;
  alCambiarEstado: (destino: AtractivoAdmin, activar: boolean) => Promise<boolean>;
  procesando: boolean;
}) {
  const etiquetas = destino.categorias
    .map((id) => nombresCategoria.get(id))
    .filter((nombre): nombre is string => Boolean(nombre));

  return (
    <tr className="border-t border-[var(--color-border)] transition hover:bg-[var(--color-brand)]/10">
      <td className="px-5 py-5">
        {/* El enlace va al detalle público, que es donde el touristave el
            destino tal como quedará publicado. */}
        <Link
          to={`/destinos/${destino.id_atractivo}`}
          className="text-sm font-black underline-offset-4 transition hover:text-[var(--color-brand)] hover:underline"
        >
          {destino.nombre}
        </Link>

        {destino.direccion && (
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
            {destino.direccion}
          </p>
        )}

        {!destino.activo && (
          <p className="mt-1.5 inline-flex bg-[var(--color-border)] px-2.5 py-1 text-xs font-black text-[var(--color-text-muted)]">
            Fuera del catálogo
          </p>
        )}
      </td>

      <td className="px-5 py-5">
        {etiquetas.length === 0 ? (
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">
            Sin categoría
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {etiquetas.map((etiqueta) => (
              <span
                key={etiqueta}
                className="border border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 px-2.5 py-1 text-xs font-black text-[var(--color-brand)]"
              >
                {etiqueta}
              </span>
            ))}
          </div>
        )}
      </td>

      <td className="px-5 py-5 font-data text-xs text-[var(--color-text-muted)]">
        {formatearDuracion(destino.duracion_minutos)}
      </td>

      <td className="px-5 py-5">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-black ${
            destino.activo ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              destino.activo ? "bg-[var(--color-route)]" : "bg-[var(--color-text-muted)]"
            }`}
          />
          {destino.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      <td className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/mi-cuenta/destinos/${destino.id_atractivo}/editar`}
            className="lp-button lp-button--secondary inline-flex min-h-11 items-center px-4 py-1.5 text-xs font-black"
          >
            Editar
          </Link>

          <button
            type="button"
            onClick={() => void alCambiarEstado(destino, !destino.activo)}
            disabled={procesando}
            className={`min-h-11 border px-4 py-1.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
              destino.activo
                ? "border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:border-[var(--color-danger)]"
                : "border-[var(--color-brand)]/40 text-[var(--color-brand)] hover:border-[var(--color-route)]"
            }`}
          >
            {procesando
              ? "…"
              : destino.activo
                ? "Dar de baja"
                : "Reactivar"}
          </button>
        </div>
      </td>
    </tr>
  );
}
