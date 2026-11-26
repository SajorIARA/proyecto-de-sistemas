/**
 * Guarda de rol para las rutas privadas de la sección de cuenta.
 *
 * Se monta dentro de `ProtectedRoute`, así que la autenticación ya está
 * resuelta: aquí solo se decide si la sesión tiene el rol requerido.
 *
 * Ante un rol insuficiente NO se redirige en silencio. Se muestra un
 * aviso explícito con salida al catálogo, porque redirigir a `/mi-cuenta`
 * dejaría al usuario en un bucle invisible: entraba a `/usuarios`, lo
 * echábamos a `/mi-cuenta` y no entendía por qué.
 *
 * Esto es solo UX: la autorización real la aplica Django, que responde 403
 * a `GET /api/auth/usuarios/` para quien no es ADMIN.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";
import { RoleBadge } from "../features/cuenta/components/RoleBadge";
import type { RolCodigo } from "../types/auth";

export function RoleRoute({
  permitidos,
  children,
}: {
  permitidos: RolCodigo[];
  children: ReactNode;
}) {
  const { roles } = useAuth();

  const autorizado = permitidos.some((rol) => roles.includes(rol));

  if (autorizado) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] px-5 py-12 text-[var(--color-text)] sm:px-8">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-[var(--color-border)]/[0.08] bg-[var(--color-surface)] shadow-[0_20px_60px_rgba(72,55,38,0.08)]">
        <div className="h-[3px] w-full bg-[var(--color-action)]" aria-hidden="true" />

        <div className="px-7 py-9 sm:px-10 sm:py-11">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[var(--color-brand)]">
            Acceso restringido
          </p>

          <h1 className="mt-4 text-3xl font-black leading-[1.02] tracking-[-0.04em] text-[var(--color-text)]">
            Esta sección es solo para administradores.
          </h1>

          <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
            Tu cuenta no tiene el permiso necesario para ver este contenido.
            Si creés que es un error, pedile a un administrador que revise tu
            rol.
          </p>

          {roles.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-text-muted)]">
                Tu rol actual:
              </span>

              {roles.map((rol) => <RoleBadge key={rol} rol={rol} />)}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/destinos"
              className="rounded-full bg-[var(--color-route-strong)] px-6 py-3 text-sm font-black text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              Ir al catálogo
            </Link>

            <Link
              to="/mi-cuenta"
              className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 text-sm font-black text-[var(--color-brand)] transition hover:border-[var(--color-border-strong)]"
            >
              Volver a mi perfil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
