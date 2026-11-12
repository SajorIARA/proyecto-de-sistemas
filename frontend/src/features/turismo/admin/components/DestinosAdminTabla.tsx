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
    <tr className="border-t border-[#5B3A29]/[0.06]">
      {COLUMNAS.map((columna) => (
        <td key={columna} className="px-5 py-5">
          <div className="h-3.5 w-full max-w-[9rem] animate-pulse rounded-full bg-[#5B3A29]/10" />
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
    <section className="overflow-hidden rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />

          <h2 className="text-lg font-black tracking-tight text-[#233128]">
            Destinos registrados
          </h2>
        </div>

        {!isPending && !isError && (
          <p className="text-xs font-bold text-[#746D63]" aria-live="polite">
            {data?.count ?? 0} {(data?.count ?? 0) === 1 ? "destino" : "destinos"}
          </p>
        )}
      </div>

      {/* =========================================================
          FILTROS
      ========================================================== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.valor}
              type="button"
              onClick={() => setEstado(filtro.valor)}
              aria-pressed={estado === filtro.valor}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                estado === filtro.valor
                  ? "border-[#2F4B3B] bg-[#2F4B3B] text-[#FFFDF8]"
                  : "border-[#5B3A29]/15 bg-[#F3EBDD]/60 text-[#514B43] hover:border-[#2F4B3B]/40"
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
          className="min-w-[14rem] flex-1 rounded-full border border-[#5B3A29]/15 bg-[#F3EBDD]/60 px-4 py-2 text-sm text-[#263029] transition placeholder:text-[#8A8177] focus:border-[#2F4B3B]"
        />
      </div>

      {/* =========================================================
          AVISO DE ALCANCE DEL FILTRO
      ========================================================== */}
      {!isPending && !isError && (texto.trim() !== "" || estado !== "activos") && (
        <p className="border-b border-[#5B3A29]/[0.08] bg-[#C6923B]/[0.07] px-6 py-2.5 text-xs text-[#7A5618] sm:px-8">
          El filtro se aplica a los destinos de esta página ({destinos.length} de{" "}
          {data?.results.length ?? 0}). El backend no admite búsqueda en el
          listado de administración.
        </p>
      )}

      {/* Error de la operación de baja/reactivación */}
      {errorEstado && (
        <p
          role="alert"
          className="border-b border-[#9A3B2E]/20 bg-[#9A3B2E]/[0.07] px-6 py-3 text-sm font-semibold text-[#9A3B2E] sm:px-8"
        >
          {errorEstado}
        </p>
      )}

      {/* =========================================================
          ESQUELETO DE CARGA
      ========================================================== */}
      {isPending && (
        <>
          <p className="px-6 pt-6 text-sm font-semibold text-[#746D63] sm:px-8" role="status">
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
          <p role="alert" className="text-sm font-semibold text-[#9A3B2E]">
            {error instanceof Error ? error.message : "No pudimos cargar los destinos."}
          </p>

          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 rounded-full border border-[#2F4B3B]/25 px-6 py-2.5 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B]"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* =========================================================
          VACÍO
      ========================================================== */}
      {!isPending && !isError && destinos.length === 0 && (
        <p className="px-6 py-12 text-center text-sm font-semibold text-[#746D63] sm:px-8">
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
                <tr className="bg-[#9A5B3C]/[0.05]">
                  {COLUMNAS.map((columna) => (
                    <th
                      key={columna}
                      scope="col"
                      className="px-5 py-3.5 text-left text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]"
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
              className="flex items-center justify-between gap-4 border-t border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8"
            >
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded-full border border-[#2F4B3B]/25 px-5 py-2 text-xs font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>

              <p className="text-xs font-bold text-[#746D63]">
                Página {pagina} de {totalPaginas}
              </p>

              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="rounded-full border border-[#2F4B3B]/25 px-5 py-2 text-xs font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-40"
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
    <tr className="border-t border-[#5B3A29]/[0.06] transition hover:bg-[#9A5B3C]/[0.04]">
      <td className="px-5 py-5">
        {/* El enlace va al detalle público, que es donde el touristave el
            destino tal como quedará publicado. */}
        <Link
          to={`/destinos/${destino.id_atractivo}`}
          className="text-sm font-black text-[#263029] underline-offset-4 transition hover:text-[#9A5B3C] hover:underline"
        >
          {destino.nombre}
        </Link>

        {destino.direccion && (
          <p className="mt-1 truncate text-xs text-[#746D63]">
            {destino.direccion}
          </p>
        )}

        {!destino.activo && (
          <p className="mt-1.5 inline-flex rounded-full bg-[#8A8177]/15 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#6B655C]">
            Fuera del catálogo
          </p>
        )}
      </td>

      <td className="px-5 py-5">
        {etiquetas.length === 0 ? (
          <span className="text-xs font-semibold text-[#8A8177]">
            Sin categoría
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {etiquetas.map((etiqueta) => (
              <span
                key={etiqueta}
                className="rounded-full border border-[#C6923B]/40 bg-[#C6923B]/[0.12] px-2.5 py-1 text-[0.65rem] font-black text-[#7A5618]"
              >
                {etiqueta}
              </span>
            ))}
          </div>
        )}
      </td>

      <td className="px-5 py-5 text-xs font-semibold text-[#746D63]">
        {formatearDuracion(destino.duracion_minutos)}
      </td>

      <td className="px-5 py-5">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-black ${
            destino.activo ? "text-[#2F4B3B]" : "text-[#8A8177]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              destino.activo ? "bg-[#2F4B3B]" : "bg-[#8A8177]"
            }`}
          />
          {destino.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      <td className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/mi-cuenta/destinos/${destino.id_atractivo}/editar`}
            className="rounded-full border border-[#2F4B3B]/25 px-4 py-1.5 text-xs font-black text-[#2F4B3B] transition hover:border-[#2F4B3B]"
          >
            Editar
          </Link>

          <button
            type="button"
            onClick={() => void alCambiarEstado(destino, !destino.activo)}
            disabled={procesando}
            className={`rounded-full border px-4 py-1.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
              destino.activo
                ? "border-[#9A3B2E]/30 text-[#9A3B2E] hover:border-[#9A3B2E]"
                : "border-[#2F4B3B]/25 text-[#2F4B3B] hover:border-[#2F4B3B]"
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