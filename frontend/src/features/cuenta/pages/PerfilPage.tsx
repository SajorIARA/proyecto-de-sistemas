/**
 * Panel personal — ruta `/mi-cuenta`.
 *
 * La portada de la bitácora: una credencial de campo con la identidad del
 * viajero, el índice numerado de las herramientas de su cuenta y la ficha
 * de seguridad. El administrador suma a ese índice la mesa de trabajo
 * (destinos y usuarios). La lógica de sesión y de cambio de contraseña no
 * cambió: solo se reorganizó la presentación.
 */

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icono, type NombreIcono } from "../../../components/site/Iconos";
import { useAuth } from "../../auth/context/AuthContext";
import { PrivateShell } from "../components/PrivateShell";
import { PasswordForm } from "../components/PasswordForm";
import { RoleBadge } from "../components/RoleBadge";

interface Acceso {
  to: string;
  titulo: string;
  detalle: string;
  icono: NombreIcono;
}

const ACCESOS_BASE: Acceso[] = [
  {
    to: "/mi-cuenta/recomendaciones",
    titulo: "Recomendaciones personalizadas",
    detalle: "Top-K por afinidad, costos en BOB y traslados estimados.",
    icono: "brujula",
  },
  {
    to: "/mi-cuenta/preferencias",
    titulo: "Preferencias de viaje",
    detalle: "Categorías, presupuesto, duración y punto de partida.",
    icono: "ruta",
  },
];

const ACCESOS_ADMIN: Acceso[] = [
  {
    to: "/mi-cuenta/destinos",
    titulo: "Gestión de destinos",
    detalle: "Administrar los atractivos turísticos del catálogo.",
    icono: "montana",
  },
  {
    to: "/mi-cuenta/usuarios",
    titulo: "Panel de usuarios",
    detalle: "Consultar las cuentas registradas y sus permisos.",
    icono: "usuario",
  },
];

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "");
}

function numero(valor: number): string {
  return String(valor).padStart(2, "0");
}

function FichaAcceso({ acceso, indice }: { acceso: Acceso; indice: number }) {
  return (
    <Link
      to={acceso.to}
      className="group grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[#5B3A29]/10 px-5 py-5 transition last:border-b-0 hover:bg-[#F3EBDD]/45 sm:px-7"
    >
      <span
        aria-hidden="true"
        className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#C6923B]"
      >
        {numero(indice)}
      </span>

      <div className="flex min-w-0 items-start gap-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[#2F4B3B]/20 text-[#2F4B3B] transition group-hover:border-[#233128] group-hover:bg-[#233128] group-hover:text-[#FFFDF8]">
          <Icono nombre={acceso.icono} className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <h3 className="font-display text-base font-black leading-snug text-[#233128] transition group-hover:text-[#8D4F32]">
            {acceso.titulo}
          </h3>

          <p className="mt-1 text-xs leading-6 text-[#746D63]">
            {acceso.detalle}
          </p>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="font-mono text-sm text-[#9A5B3C] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}

function DatoCredencial({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 pr-5 sm:pr-8">
      <dt className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#F3EBDD]/55">
        {etiqueta}
      </dt>
      <dd className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F3EBDD]">
        {children}
      </dd>
    </div>
  );
}

export function PerfilPage() {
  const { user, roles, esAdmin } = useAuth();
  const [modalAbierto, setModalAbierto] = useState(false);

  const nombre = user?.nombre?.trim() || "Turista";
  const email = user?.email ?? "";
  const accesos = esAdmin
    ? [...ACCESOS_BASE, ...ACCESOS_ADMIN]
    : ACCESOS_BASE;

  return (
    <PrivateShell
      eyebrow="Área privada"
      titulo={`Hola, ${nombre}`}
      descripcion="Gestiona tu información personal, los accesos de tu cuenta y tus opciones de seguridad."
    >
      <div className="space-y-8">
        {/* =========================================================
            CREDENCIAL DE CAMPO
        ========================================================== */}
        <section className="relative overflow-hidden border border-[#233128] bg-[#233128] text-[#F3EBDD]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #F3EBDD 0 1px, transparent 1px 18px)",
            }}
          />

          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-[#F3EBDD]/30 bg-[#F3EBDD]/[0.06] font-display text-3xl font-black uppercase tracking-tight">
              {iniciales(nombre)}
            </div>

            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#E8C16A]">
                Cuaderno de campo · Turismo La Paz
              </p>

              <h2 className="mt-2 break-words font-display text-3xl font-black leading-none tracking-[-0.03em] sm:text-4xl">
                {nombre}
              </h2>

              <p className="mt-2 break-all font-mono text-[10px] tracking-[0.06em] text-[#F3EBDD]/65">
                {email}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="flex flex-wrap gap-2">
                {roles.length === 0 ? (
                  <span className="border border-[#F3EBDD]/25 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#F3EBDD]/70">
                    Sin rol
                  </span>
                ) : (
                  roles.map((rol) => (
                    <RoleBadge key={rol} rol={rol} tono="oscuro" />
                  ))
                )}
              </div>

              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#F3EBDD]/45">
                {esAdmin ? "Acceso a la mesa de trabajo" : "Bitácora personal"}
              </p>
            </div>
          </div>

          <dl className="relative grid grid-cols-2 gap-y-5 border-t border-[#F3EBDD]/15 px-6 py-5 sm:grid-cols-3 sm:px-8">
            <DatoCredencial etiqueta="Rol">
              {esAdmin ? "Administrador" : "Turista"}
            </DatoCredencial>

            <div className="border-l border-[#F3EBDD]/15 pl-5 sm:pl-8">
              <DatoCredencial etiqueta="Acceso">
                {esAdmin ? "Panel completo" : "Bitácora personal"}
              </DatoCredencial>
            </div>

            <div className="col-span-2 border-t border-[#F3EBDD]/15 pt-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:pb-0 sm:pl-8 sm:pt-0">
              <DatoCredencial etiqueta="Sede">La Paz · Bolivia</DatoCredencial>
            </div>
          </dl>
        </section>

        {/* =========================================================
            ÍNDICE Y SEGURIDAD
        ========================================================== */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-start">
          <section className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]">
            <div className="flex items-end justify-between gap-4 border-b border-[#5B3A29]/15 px-5 py-5 sm:px-7">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
                  01 / Índice
                </p>

                <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
                  Tu bitácora
                </h2>
              </div>

              <p className="hidden font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A8177] sm:block">
                {numero(accesos.length)} fichas
              </p>
            </div>

            <div>
              {accesos.map((acceso, posicion) => (
                <FichaAcceso
                  key={acceso.to}
                  acceso={acceso}
                  indice={posicion + 1}
                />
              ))}
            </div>

            <div className="border-t border-[#5B3A29]/15 bg-[#F3EBDD]/55 px-5 py-5 sm:px-7">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#746D63]">
                Permisos de la cuenta
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {roles.length === 0 ? (
                  <p className="text-xs leading-6 text-[#746D63]">
                    Tu cuenta no tiene un rol asignado. Contacta al
                    administrador si necesitás acceso al panel.
                  </p>
                ) : (
                  roles.map((rol) => <RoleBadge key={rol} rol={rol} />)
                )}
              </div>

              <p className="mt-3 max-w-xl text-xs leading-6 text-[#746D63]">
                {esAdmin
                  ? "Como administrador tenés acceso a la gestión de destinos y al panel de usuarios de la plataforma."
                  : "Tu rol de turista te permite explorar el catálogo y gestionar tu cuenta."}
              </p>
            </div>
          </section>

          <section className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]">
            <div className="border-b border-[#5B3A29]/15 px-5 py-5 sm:px-7">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
                02 / Seguridad
              </p>

              <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
                Protege tu acceso
              </h2>
            </div>

            <div className="px-5 py-6 sm:px-7">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[#2F4B3B]/20 text-[#2F4B3B]">
                  <Icono nombre="escudo" className="h-4 w-4" />
                </span>

                <p className="text-xs leading-6 text-[#5C574E]">
                  Mantén el control de tu cuenta con una contraseña segura y
                  personal. Las claves se validan del lado del servidor.
                </p>
              </div>

              <div className="mt-6 border border-[#5B3A29]/15 bg-[#F3EBDD]/40 px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#746D63]">
                    Clave de acceso
                  </p>

                  <span
                    aria-hidden="true"
                    className="font-mono text-xs tracking-[0.24em] text-[#233128]"
                  >
                    ••••••••
                  </span>
                </div>

                <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-[#2F4B3B]">
                  Protegida y privada
                </p>
              </div>

              <div className="mt-6">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A8177]">
                  Antes de cambiarla
                </p>

                <ul className="mt-3 space-y-2.5">
                  {[
                    "Elige una contraseña difícil de adivinar.",
                    "Usa al menos ocho caracteres.",
                    "No la compartas con otras personas.",
                  ].map((consejo) => (
                    <li
                      key={consejo}
                      className="flex items-start gap-2.5 text-xs leading-6 text-[#6F655B]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[#2F4B3B]/30 bg-[#EDF2E9] text-[8px] font-black text-[#2F4B3B]"
                      >
                        ✓
                      </span>
                      {consejo}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="group mt-7 flex w-full items-center justify-between gap-4 bg-[#233128] px-5 py-4 text-left font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8] transition hover:bg-[#2F4B3B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#233128]"
              >
                Cambiar contraseña
                <span
                  aria-hidden="true"
                  className="font-display text-base transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                >
                  →
                </span>
              </button>

              <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.16em] text-[#968C7E]">
                La sesión sigue activa tras el cambio
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* =========================================================
          MODAL: REUTILIZA EL FORMULARIO EXISTENTE
      ========================================================== */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#101710]/80 p-4"
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
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              aria-label="Cerrar ventana"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center border border-[#5B3A29]/20 bg-[#F3EBDD] font-mono text-sm text-[#233128] transition hover:bg-[#E8D5B5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#233128]"
            >
              ✕
            </button>

            <PasswordForm />
          </div>
        </div>
      )}
    </PrivateShell>
  );
}
