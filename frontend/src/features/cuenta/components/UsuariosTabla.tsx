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

/** Iniciales del nombre, para el avatar de texto. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);

  return (partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "");
}

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

function Fila({ usuario }: { usuario: UsuarioAdmin }) {
  return (
    <tr className="border-t border-[#5B3A29]/[0.06] transition hover:bg-[#9A5B3C]/[0.04]">
      <td className="px-5 py-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4B3B]/10 text-xs font-black uppercase text-[#2F4B3B]"
          >
            {iniciales(usuario.nombre)}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#263029]">
              {usuario.nombre}
            </p>

            <p className="truncate text-xs text-[#746D63]">{usuario.email}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-5">
        <div className="flex flex-wrap gap-1.5">
          {usuario.roles.length === 0 ? (
            <span className="text-xs font-semibold text-[#8A8177]">
              Sin rol asignado
            </span>
          ) : (
            usuario.roles.map((rol) => <RoleBadge key={rol} rol={rol} />)
          )}
        </div>
      </td>

      <td className="px-5 py-5">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-black ${
            usuario.activo ? "text-[#2F4B3B]" : "text-[#8A8177]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              usuario.activo ? "bg-[#2F4B3B]" : "bg-[#8A8177]"
            }`}
          />
          {usuario.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      <td className="px-5 py-5 text-xs font-semibold text-[#746D63]">
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
    <section className="overflow-hidden rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />

          {/* Título distinto del h1 de la página: si se repitiera, la
              pantalla tendría dos encabezados idénticos y un lector de
              pantalla no distinguiría la sección del título. */}
          <h2 className="text-lg font-black tracking-tight text-[#233128]">
            Cuentas registradas
          </h2>
        </div>

        {!isPending && !isError && (
          <p
            className="text-xs font-bold text-[#746D63]"
            aria-live="polite"
          >
            {data?.count ?? 0} {data?.count === 1 ? "usuario" : "usuarios"}
          </p>
        )}
      </div>

      {/* =========================================================
          ESQUELETO DE CARGA
      ========================================================== */}
      {isPending && (
        <>
          <p
            className="px-6 pt-6 text-sm font-semibold text-[#746D63] sm:px-8"
            role="status"
          >
            Cargando usuarios…
          </p>

          <div className="mt-5 overflow-x-auto">
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
        <div className="px-6 py-12 text-center sm:px-8">
          <p role="alert" className="text-sm font-semibold text-[#9A3B2E]">
            {error instanceof Error
              ? error.message
              : "No pudimos cargar los usuarios."}
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
      {!isPending && !isError && usuarios.length === 0 && (
        <p className="px-6 py-12 text-center text-sm font-semibold text-[#746D63] sm:px-8">
          Todavía no hay usuarios registrados en la plataforma.
        </p>
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
