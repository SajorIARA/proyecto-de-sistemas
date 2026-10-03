/**
 * Perfil del usuario en sesión — ruta `/mi-cuenta`.
 *
 * Sustituye al placeholder anterior, que decía que el flujo "estaba listo
 * para conectarse con Django" cuando Django ya está conectado, y que usaba
 * una paleta oscura ajena al proyecto. Ahora muestra los datos reales que
 * devuelve el backend (`nombre`, `email`, `roles`) y el formulario de cambio
 * de contraseña, que también es real (`POST /api/auth/password/change/`).
 *
 * Accesible para ADMIN y TOURIST: solo el rol ADMIN ve los accesos a la
 * gestión de destinos y al panel de usuarios.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { PrivateShell } from "../components/PrivateShell";
import { PasswordForm } from "../components/PasswordForm";
import { RoleBadge } from "../components/RoleBadge";

/** Une nombre y apellido en un bloque de iniciales. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);

  return (partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "");
}

/** Tarjeta de acceso rápido a una sección del panel de administración. */
function AtajoAdmin({
  to,
  titulo,
  descripcion,
}: {
  to: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-4 rounded-2xl border border-[#9A5B3C]/25 bg-[#9A5B3C]/[0.07] px-5 py-4 transition hover:border-[#9A5B3C]"
    >
      <span>
        <span className="block text-sm font-black text-[#8D4F32]">{titulo}</span>

        <span className="mt-1 block text-xs text-[#746D63]">{descripcion}</span>
      </span>

      <span aria-hidden="true" className="text-lg text-[#9A5B3C]">
        →
      </span>
    </Link>
  );
}

export function PerfilPage() {
  const { user, roles, esAdmin } = useAuth();

  const nombre = user?.nombre?.trim() || "Turista";
  const email = user?.email ?? "";

  return (
    <PrivateShell
      eyebrow="Área privada"
      titulo={`Hola, ${nombre}`}
      descripcion="Estos son los datos con los que iniciaste sesión. Revisa tu información y mantén tu contraseña al día."
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        {/* =========================================================
            DATOS DE LA CUENTA
        ========================================================== */}
        <section className="overflow-hidden rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.08)]">
          <div className="flex items-center gap-3 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
            <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />

            <h2 className="text-lg font-black tracking-tight text-[#233128]">
              Tus datos
            </h2>
          </div>

          <div className="px-6 py-7 sm:px-8">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2F4B3B] text-lg font-black uppercase text-[#FFFDF8]"
              >
                {iniciales(nombre)}
              </span>

              <div className="min-w-0">
                <p className="truncate text-xl font-black tracking-tight text-[#233128]">
                  {nombre}
                </p>

                <p className="truncate text-sm text-[#746D63]">{email}</p>
              </div>
            </div>

            {/* Roles */}
            <div className="mt-7 border-t border-[#5B3A29]/[0.08] pt-6">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]">
                Permisos en la plataforma
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {roles.length === 0 ? (
                  <p className="text-sm text-[#746D63]">
                    Tu cuenta no tiene un rol asignado. Contacta al administrador
                    si necesitás acceso al panel.
                  </p>
                ) : (
                  roles.map((rol) => <RoleBadge key={rol} rol={rol} />)
                )}
              </div>

              <p className="mt-4 text-xs leading-6 text-[#746D63]">
                {esAdmin
                  ? "Como administrador tenés acceso a la gestión de destinos y al panel de usuarios de la plataforma."
                  : "Tu rol de turista te permite explorar el catálogo y gestionar tu cuenta."}
              </p>
            </div>

            {/* Atajos al panel (solo ADMIN) */}
            {esAdmin && (
              <div className="mt-7 space-y-3">
                <AtajoAdmin
                  to="/mi-cuenta/destinos"
                  titulo="Gestión de destinos"
                  descripcion="Alta, edición y baja del catálogo"
                />

                <AtajoAdmin
                  to="/mi-cuenta/usuarios"
                  titulo="Panel de usuarios"
                  descripcion="Listado de cuentas registradas"
                />
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            SEGURIDAD
        ========================================================== */}
        <PasswordForm />
      </div>
    </PrivateShell>
  );
}
