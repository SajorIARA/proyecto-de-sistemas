
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { PrivateShell } from "../components/PrivateShell";
import { PasswordForm } from "../components/PasswordForm";
import { RoleBadge } from "../components/RoleBadge";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "");
}

function AtajoAdmin({
  to,
  titulo,
  descripcion,
  icono,
}: {
  to: string;
  titulo: string;
  descripcion: string;
  icono: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-[#E9DFD0] bg-[#FFFCF7] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C6923B]/50 hover:bg-white hover:shadow-[0_12px_30px_rgba(60,50,35,0.08)]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1E9DB] text-xl transition-colors group-hover:bg-[#E8D5B5]">
        <span aria-hidden="true">{icono}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-black text-[#263B30]">
          {titulo}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[#82786D]">
          {descripcion}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E9DFD0] text-[#9A5B3C] transition-all group-hover:translate-x-1 group-hover:border-[#2F4B3B] group-hover:bg-[#2F4B3B] group-hover:text-white"
      >
        →
      </span>
    </Link>
  );
}

export function PerfilPage() {
  const { user, roles, esAdmin } = useAuth();
  const [modalAbierto, setModalAbierto] = useState(false);

  const nombre = user?.nombre?.trim() || "Turista";
  const email = user?.email ?? "";

  return (
    <PrivateShell
      eyebrow="Área privada"
      titulo={`Hola, ${nombre}`}
      descripcion="Gestiona tu información personal, los accesos de tu cuenta y tus opciones de seguridad."
    >
      <div className="space-y-7">

        {/* ENCABEZADO DEL PERFIL */}
        <div className="relative overflow-hidden rounded-[2rem] bg-[#2F4B3B] p-6 text-[#FFFDF8] shadow-[0_18px_45px_rgba(47,75,59,0.16)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 right-16 h-56 w-56 rounded-full border border-white/10"
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] border border-white/20 bg-white/15 text-3xl font-black uppercase shadow-inner">
              {iniciales(nombre)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-[#E8C16A]">
                Mi cuenta · Turismo La Paz
              </p>

              <h2 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                {nombre}
              </h2>

              <p className="mt-1 break-all text-sm text-[#E0E8DE]">
                {email}
              </p>
            </div>

            <div className="self-start rounded-full border border-[#E8C16A]/30 bg-[#E8C16A]/10 px-4 py-2 text-xs font-black text-[#F3D992]">
              {esAdmin ? "✦ Administrador" : "✦ Miembro"}
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">

          {/* INFORMACIÓN Y ACCESOS */}
          <section className="overflow-hidden rounded-[1.75rem] border border-[#E9DFD0] bg-[#FFFDF8] shadow-[0_15px_45px_rgba(72,55,38,0.06)]">

            <div className="flex items-center gap-3 border-b border-[#EEE5D8] px-6 py-5 sm:px-7">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1E8DB] text-xl"
              >
                👤
              </span>

              <div>
                <h2 className="text-lg font-black text-[#233128]">
                  Información de la cuenta
                </h2>
                <p className="mt-0.5 text-xs text-[#82786D]">
                  Identidad y permisos de acceso
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7">

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#9A5B3C]">
                    Nombre de usuario
                  </p>

                  <p className="mt-2 break-words text-sm font-bold text-[#263B30]">
                    {nombre}
                  </p>
                </div>

                <div>
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#9A5B3C]">
                    Correo electrónico
                  </p>

                  <p className="mt-2 break-all text-sm font-bold text-[#263B30]">
                    {email}
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-[#EEE5D8] pt-6">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#9A5B3C]">
                  Roles y permisos
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {roles.length === 0 ? (
                    <p className="text-sm leading-6 text-[#746D63]">
                      Tu cuenta no tiene un rol asignado. Contacta al administrador si necesitás acceso al panel.
                    </p>
                  ) : (
                    roles.map((rol) => (
                      <RoleBadge key={rol} rol={rol} />
                    ))
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-[#DDE8DD] bg-[#F1F6F0] px-4 py-3">
                  <p className="text-xs leading-6 text-[#496454]">
                    {esAdmin
                      ? "Como administrador tenés acceso a la gestión de destinos y al panel de usuarios de la plataforma."
                      : "Tu rol de turista te permite explorar el catálogo y gestionar tu cuenta."}
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-[#EEE5D8] pt-6">
                <h3 className="text-sm font-black text-[#263B30]">
                  Accesos rápidos
                </h3>

                <p className="mt-1 text-xs text-[#82786D]">
                  Accede a las herramientas disponibles para tu cuenta.
                </p>

                <div className="mt-4 space-y-3">
                  <AtajoAdmin
                    to="/mi-cuenta/preferencias"
                    titulo="Preferencias de viaje"
                    descripcion="Categorías, presupuesto, duración y punto de partida"
                    icono="🧭"
                  />

                  {esAdmin && (
                    <>
                      <AtajoAdmin
                        to="/mi-cuenta/destinos"
                        titulo="Gestión de destinos"
                        descripcion="Administrar los atractivos turísticos"
                        icono="🏔️"
                      />

                      <AtajoAdmin
                        to="/mi-cuenta/usuarios"
                        titulo="Panel de usuarios"
                        descripcion="Consultar las cuentas registradas"
                        icono="👥"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SEGURIDAD DE LA CUENTA */}
          <section className="overflow-hidden rounded-[1.75rem] border border-[#E9DFD0] bg-[#FFFDF8] shadow-[0_15px_45px_rgba(72,55,38,0.06)]">

            <div className="flex items-center gap-3 border-b border-[#EEE5D8] px-6 py-5 sm:px-7">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7EFE7] text-xl"
              >
                🔐
              </span>

              <div>
                <h2 className="text-lg font-black text-[#233128]">
                  Seguridad de la cuenta
                </h2>
                <p className="mt-0.5 text-xs text-[#82786D]">
                  Protección de tus credenciales
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7">

              <div className="flex items-start gap-4 rounded-2xl border border-[#DCE8DC] bg-[#F3F7F1] p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DDE9D8] text-2xl">
                  🛡️
                </div>

                <div>
                  <h3 className="text-base font-black text-[#2F4B3B]">
                    Protege tu información
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#607466]">
                    Mantén el control de tu cuenta utilizando una contraseña segura y personal.
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#9A5B3C]">
                  Contraseña de acceso
                </p>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#E9DFD0] bg-[#FFFCF7] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1E8DB] text-xl">
                      🔑
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#263B30]">
                        Tu contraseña
                      </p>

                      <p className="mt-1 text-xs text-[#82786D]">
                        Protegida y privada
                      </p>
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xs font-bold tracking-[0.2em] text-[#6B786E]"
                  >
                    ••••••••
                  </span>
                </div>
              </div>

              <div className="mt-7 rounded-2xl bg-[#F5EEE2] p-5">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-[#8D4F32]">
                  Consejos de seguridad
                </p>

                <ul className="mt-3 space-y-3 text-xs leading-6 text-[#6F655B]">
                  <li className="flex items-start gap-2">
                    <span className="font-black text-[#6F8064]">✓</span>
                    Utiliza una contraseña difícil de adivinar.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-black text-[#6F8064]">✓</span>
                    Incluye al menos 8 caracteres.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-black text-[#6F8064]">✓</span>
                    Evita compartir tu contraseña con otras personas.
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="group mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#2F4B3B] px-6 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(47,75,59,0.17)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3C5C48] hover:shadow-[0_16px_34px_rgba(47,75,59,0.23)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2F4B3B]"
              >
                <span aria-hidden="true" className="text-lg">
                  🔒
                </span>

                Cambiar contraseña

                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-[#91877B]">
                Podrás actualizar tu contraseña de forma segura.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL: REUTILIZA EL FORMULARIO EXISTENTE */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14251D]/75 p-4 backdrop-blur-[6px]"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setModalAbierto(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cambiar contraseña"
            className="relative my-auto w-full max-w-xl"
          >
            <div className="absolute -inset-1 rounded-[2.2rem] bg-gradient-to-br from-[#E8C16A]/35 via-transparent to-[#6F8064]/30 blur-lg" />

            <div className="relative">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar ventana"
                className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#E6DCCB] bg-[#F3EBDD] text-lg font-bold text-[#233128] shadow-sm transition hover:rotate-90 hover:bg-[#E8D5B5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F4B3B]"
              >
                ✕
              </button>

              <PasswordForm />
            </div>
          </div>
        </div>
      )}
    </PrivateShell>
  );
}
