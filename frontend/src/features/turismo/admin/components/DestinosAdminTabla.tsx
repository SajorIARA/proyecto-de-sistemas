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
import { Icono } from "../../../../components/site/Iconos";
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

function numero(valor: number): string {
  return String(valor).padStart(2, "0");
}

function FilaSkeleton() {
  return (
    <tr className="border-t border-[#5B3A29]/10">
      {COLUMNAS.map((columna) => (
        <td key={columna} className="px-5 py-5">
          <div className="h-3 w-full max-w-[9rem] animate-pulse bg-[#5B3A29]/10" />
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
    <section className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#5B3A29]/15 px-5 py-5 sm:px-7">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
            02 / Catálogo interno
          </p>

          <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
            Destinos registrados
          </h2>
        </div>

        {!isPending && !isError && (
          <div className="flex items-end gap-3">
            <span
              aria-hidden="true"
              className="font-display text-4xl font-black leading-none text-[#9A5B3C]"
            >
              {numero(data?.count ?? 0)}
            </span>

            <p
              className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#746D63]"
              aria-live="polite"
            >
              {data?.count ?? 0} {(data?.count ?? 0) === 1 ? "destino" : "destinos"}
            </p>
          </div>
        )}
      </div>

      {/* =========================================================
          FILTROS
      ========================================================== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#5B3A29]/15 bg-[#F3EBDD]/35 px-5 py-4 sm:px-7">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar por estado"
        >
          {FILTROS.map((filtro) => (
            <button
              key={filtro.valor}
              type="button"
              onClick={() => setEstado(filtro.valor)}
              aria-pressed={estado === filtro.valor}
              className={`border px-3.5 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.16em] transition ${
                estado === filtro.valor
                  ? "border-[#233128] bg-[#233128] text-[#FFFDF8]"
                  : "border-[#5B3A29]/20 bg-transparent text-[#514B43] hover:border-[#233128]/45 hover:text-[#233128]"
              }`}
            >
              {filtro.etiqueta}
            </button>
          ))}
        </div>

        <label htmlFor="buscar-destino" className="sr-only">
          Buscar destino por nombre, descripción o dirección
        </label>

        <div className="relative min-w-[14rem] flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9A5B3C]"
          >
            <Icono nombre="buscar" className="h-3.5 w-3.5" />
          </span>

          <input
            id="buscar-destino"
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Buscar por nombre o dirección…"
            className="w-full border border-[#5B3A29]/20 bg-[#FFFDF8] py-2 pl-9 pr-3 text-sm text-[#233128] outline-none transition placeholder:text-[#968C7E] hover:border-[#2F4B3B]/45 focus:border-[#2F4B3B] focus:ring-1 focus:ring-[#2F4B3B]/20"
          />
        </div>
      </div>

      {/* =========================================================
          AVISO DE ALCANCE DEL FILTRO
      ========================================================== */}
      {!isPending && !isError && (texto.trim() !== "" || estado !== "activos") && (
        <p className="border-b border-[#C6923B]/30 border-l-2 border-l-[#C6923B] bg-[#FBF0D9] px-5 py-2.5 text-xs leading-6 text-[#664717] sm:px-7">
          El filtro se aplica a los destinos de esta página ({destinos.length} de{" "}
          {data?.results.length ?? 0}). El backend no admite búsqueda en el
          listado de administración.
        </p>
      )}

      {/* Error de la operación de baja/reactivación */}
      {errorEstado && (
        <p
          role="alert"
          className="border-b border-[#9A5B3C]/25 bg-[#F6E8DF] px-5 py-3 text-sm font-semibold text-[#713A2A] sm:px-7"
        >
          {errorEstado}
        </p>
      )}

      {!isPending && !isError && destinos.length > 0 && (
        <p className="border-b border-[#5B3A29]/10 bg-[#F3EBDD]/35 px-5 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8A8177] sm:hidden">
          Desliza la tabla para ver estado y acciones →
        </p>
      )}

      {/* =========================================================
          ESQUELETO DE CARGA
      ========================================================== */}
      {isPending && (
        <>
          <p
            className="px-5 pt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-[#746D63] sm:px-7"
            role="status"
          >
            Cargando destinos…
          </p>

          <div className="mt-4 overflow-x-auto">
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
        <div className="px-5 py-12 text-center sm:px-7">
          <p
            role="alert"
            className="mx-auto max-w-md border-l-2 border-[#9A5B3C]/50 bg-[#F6E8DF]/60 px-4 py-3 text-left text-sm font-semibold leading-6 text-[#713A2A]"
          >
            {error instanceof Error ? error.message : "No pudimos cargar los destinos."}
          </p>

          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 border border-[#233128]/25 px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#233128] transition hover:border-[#233128] hover:bg-[#233128] hover:text-[#FFFDF8]"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* =========================================================
          VACÍO
      ========================================================== */}
      {!isPending && !isError && destinos.length === 0 && (
        <div className="px-5 py-12 text-center sm:px-7">
          <p className="mx-auto max-w-md text-sm leading-7 text-[#746D63]">
            {texto.trim() !== ""
              ? "Ningún destino coincide con la búsqueda."
              : estado === "activos"
                ? "Todavía no hay destinos activos en el catálogo."
                : estado === "inactivos"
                  ? "No hay destinos dados de baja."
                  : "Todavía no hay destinos registrados."}
          </p>
        </div>
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
                <tr className="border-b border-[#5B3A29]/15 bg-[#F3EBDD]/50">
                  {COLUMNAS.map((columna, indice) => (
                    <th
                      key={columna}
                      scope="col"
                      className="px-5 py-3.5 text-left font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-[#8D4F32]"
                    >
                      <span className="mr-2 text-[#C6923B]">
                        {numero(indice + 1)}
                      </span>
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
              className="flex items-center justify-between gap-4 border-t border-[#5B3A29]/15 px-5 py-5 sm:px-7"
            >
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="border border-[#233128]/25 px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#233128] transition hover:border-[#233128] hover:bg-[#233128] hover:text-[#FFFDF8] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#233128]"
              >
                ← Anterior
              </button>

              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#746D63]">
                Página {pagina} de {totalPaginas}
              </p>

              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="border border-[#233128]/25 px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#233128] transition hover:border-[#233128] hover:bg-[#233128] hover:text-[#FFFDF8] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#233128]"
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
  const portada = destino.fotos[0]?.url ?? null;

  return (
    <tr className="border-t border-[#5B3A29]/10 transition hover:bg-[#F3EBDD]/45">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          {portada ? (
            <img
              src={portada}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="h-12 w-12 shrink-0 border border-[#5B3A29]/15 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#5B3A29]/15 bg-[#F3EBDD] text-[#9A5B3C]"
            >
              <Icono nombre="montana" className="h-5 w-5" />
            </span>
          )}

          <div className="min-w-0">
            {/* El enlace va al detalle público, que es donde el turista ve
                el destino tal como quedará publicado. */}
            <Link
              to={`/destinos/${destino.id_atractivo}`}
              className="text-sm font-black text-[#233128] underline-offset-4 transition hover:text-[#9A5B3C] hover:underline"
            >
              {destino.nombre}
            </Link>

            {destino.direccion && (
              <p className="mt-0.5 truncate font-mono text-[9px] tracking-[0.04em] text-[#746D63]">
                {destino.direccion}
              </p>
            )}

            {!destino.activo && (
              <p className="mt-1.5 inline-flex border border-[#8A8177]/30 bg-[#EFEAE0] px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#6B655C]">
                Fuera del catálogo
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        {etiquetas.length === 0 ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8A8177]">
            Sin categoría
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {etiquetas.map((etiqueta) => (
              <span
                key={etiqueta}
                className="border border-[#C6923B]/45 bg-[#FBF0D9] px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#664717]"
              >
                {etiqueta}
              </span>
            ))}
          </div>
        )}
      </td>

      <td className="px-5 py-4 font-mono text-[9px] tracking-[0.06em] text-[#746D63]">
        {formatearDuracion(destino.duracion_minutos)}
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${
            destino.activo ? "text-[#2F4B3B]" : "text-[#8A8177]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 ${
              destino.activo ? "bg-[#2F4B3B]" : "bg-[#8A8177]"
            }`}
          />
          {destino.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/mi-cuenta/destinos/${destino.id_atractivo}/editar`}
            className="border-b border-[#233128]/30 pb-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#233128] transition hover:border-[#9A5B3C] hover:text-[#8D4F32]"
          >
            Editar
          </Link>

          <button
            type="button"
            onClick={() => void alCambiarEstado(destino, !destino.activo)}
            disabled={procesando}
            className={`border px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-45 ${
              destino.activo
                ? "border-[#9A5B3C]/35 text-[#713A2A] hover:border-[#9A5B3C] hover:bg-[#F6E8DF]"
                : "border-[#2F4B3B]/30 text-[#2F4B3B] hover:border-[#2F4B3B] hover:bg-[#EDF2E9]"
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
