/**
 * Listado de usuarios para el panel de administración.
 *
 * Consume `GET /api/auth/usuarios/`, que es de **solo lectura**: el backend
 * no expone rutas para crear, editar ni desactivar usuarios, así que aquí no
 * hay botones de acción. Agregarlos sería mostrar controles que fallan con
 * 405/404 contra Django.
 *
 * El identificador del modelo se llama `id_usuario` (no `id`), por eso se
 * usa `usuario.id_usuario` como clave de React.
 */

import { useState } from "react";
import { RoleBadge } from "./RoleBadge";
import { useUsuariosAdmin } from "../hooks/useCuenta";
import { USUARIOS_PAGE_SIZE } from "../../../config/auth";
import type { UsuarioAdmin } from "../../../types/auth";

const COLUMNAS = ["Usuario", "Roles", "Estado", "Alta"] as const;

/** `YYYY-MM-DD` → `DD/MM/YYYY`, sin arrastrar `new Date` por zonas horarias. */
function formatearFecha(iso: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

  if (!coincidencia) {
    return iso;
  }

  const [, anio, mes, dia] = coincidencia;

  return `${dia}/${mes}/${anio}`;
}

/** Iniciales del nombre, para el monograma en bloque. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);

  return (partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "");
}

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

function Fila({ usuario }: { usuario: UsuarioAdmin }) {
  return (
    <tr className="border-t border-[#5B3A29]/10 transition hover:bg-[#F3EBDD]/45">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#2F4B3B]/20 bg-[#EDF2E9] font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#2F4B3B]"
          >
            {iniciales(usuario.nombre)}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#233128]">
              {usuario.nombre}
            </p>

            <p className="truncate font-mono text-[9px] tracking-[0.04em] text-[#746D63]">
              {usuario.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-1.5">
          {usuario.roles.length === 0 ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8A8177]">
              Sin rol asignado
            </span>
          ) : (
            usuario.roles.map((rol) => <RoleBadge key={rol} rol={rol} />)
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${
            usuario.activo ? "text-[#2F4B3B]" : "text-[#8A8177]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 ${
              usuario.activo ? "bg-[#2F4B3B]" : "bg-[#8A8177]"
            }`}
          />
          {usuario.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      <td className="px-5 py-4 font-mono text-[9px] tracking-[0.08em] text-[#746D63]">
        {formatearFecha(usuario.fecha_creacion)}
      </td>
    </tr>
  );
}

export function UsuariosTabla() {
  const [pagina, setPagina] = useState(1);
  const { data, isPending, isError, error, refetch } = useUsuariosAdmin(pagina);

  const totalPaginas = data
    ? Math.max(1, Math.ceil(data.count / USUARIOS_PAGE_SIZE))
    : 1;
  const usuarios = data?.results ?? [];

  return (
    <section className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#5B3A29]/15 px-5 py-5 sm:px-7">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
            01 / Registro
          </p>

          {/* Título distinto del h1 de la página: si se repitiera, la
              pantalla tendría dos encabezados idénticos y un lector de
              pantalla no distinguiría la sección del título. */}
          <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
            Cuentas registradas
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
              {data?.count ?? 0} {data?.count === 1 ? "usuario" : "usuarios"}
            </p>
          </div>
        )}
      </div>

      {!isPending && !isError && usuarios.length > 0 && (
        <p className="border-b border-[#5B3A29]/10 bg-[#F3EBDD]/35 px-5 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8A8177] sm:hidden">
          Desliza la tabla para ver roles, estado y alta →
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
            Cargando usuarios…
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse">
              <caption className="sr-only">
                Cargando el listado de usuarios
              </caption>

              <tbody>
                {Array.from({ length: 6 }).map((_, indice) => (
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
            {error instanceof Error
              ? error.message
              : "No pudimos cargar los usuarios."}
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
      {!isPending && !isError && usuarios.length === 0 && (
        <div className="px-5 py-12 text-center sm:px-7">
          <p className="mx-auto max-w-md text-sm leading-7 text-[#746D63]">
            Todavía no hay usuarios registrados en la plataforma.
          </p>
        </div>
      )}

      {/* =========================================================
          TABLA
      ========================================================== */}
      {!isPending && !isError && usuarios.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse">
              <caption className="sr-only">
                Listado de usuarios registrados con su rol y estado
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
                {usuarios.map((usuario) => (
                  <Fila key={usuario.id_usuario} usuario={usuario} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <nav
              aria-label="Paginación de usuarios"
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
