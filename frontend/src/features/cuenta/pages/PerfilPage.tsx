import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import { Button, ButtonLink } from "../../../design-system/components/Button";
import { useAuth } from "../../auth/context/AuthContext";
import { cuentaApi, descargarMisDatos } from "../api/cuentaApi";
import { useRuta } from "../../turismo/context/RutaContext";
import { PrivateShell } from "../components/PrivateShell";
import { PasswordForm } from "../components/PasswordForm";

export function PerfilPage() {
  const { user, esAdmin, logout } = useAuth();
  const { destinos } = useRuta();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [confirmacionBaja, setConfirmacionBaja] = useState("");
  const [bajaEnCurso, setBajaEnCurso] = useState(false);
  const [bajaError, setBajaError] = useState<string | null>(null);
  const cerrarRef = useRef<HTMLButtonElement | null>(null);
  const nombre = user?.nombre?.trim() || "Viajero";
  const email = user?.email ?? "";

  useEffect(() => {
    if (!modalAbierto) return;
    const manejar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setModalAbierto(false);
    };
    document.addEventListener("keydown", manejar);
    const cuadro = requestAnimationFrame(() => cerrarRef.current?.focus());
    return () => {
      cancelAnimationFrame(cuadro);
      document.removeEventListener("keydown", manejar);
    };
  }, [modalAbierto]);

  return (
    <PrivateShell
      eyebrow={esAdmin ? "Cuenta administrativa" : "Resumen del viajero"}
      titulo={`Hola, ${nombre}`}
      descripcion={
        esAdmin
          ? "Consulta tu cuenta y accede a las operaciones disponibles para administrar la plataforma."
          : "Continúa tu recorrido, ajusta tus preferencias o revisa la seguridad de tu cuenta."
      }
    >
      <div className="space-y-7">
        {!esAdmin && (
          <section className="chuki-account-journey p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold text-[var(--color-brand)]">Viaje en curso</p>
                <h2 className="mt-2 text-2xl font-black">Tu recorrido por La Paz</h2>
                <p className="mt-3 text-sm text-white/70">
                  {destinos.length === 0
                    ? "Todavía no añadiste destinos."
                    : `${destinos.length} ${destinos.length === 1 ? "parada seleccionada" : "paradas seleccionadas"} en este navegador.`}
                </p>
              </div>
              <ButtonLink
                to={destinos.length > 0 ? "/destinos?vista=armar" : "/destinos"}
                variante="primary"
              >
                {destinos.length > 0 ? "Continuar planificando" : "Explorar destinos"}
              </ButtonLink>
            </div>
            <div className="mt-7 h-2 overflow-hidden bg-white/15" aria-hidden="true">
              <div
                className="h-full bg-[var(--color-route)]"
                style={{ width: destinos.length > 0 ? "50%" : "12%" }}
              />
            </div>
            <p className="mt-2 text-xs text-white/55">
              Completa selección, organización y revisión para terminar el borrador.
            </p>
          </section>
        )}

        {!esAdmin && (
          <div className="chuki-account-access grid gap-3 md:grid-cols-3">
            <Acceso
              to="/mi-cuenta/recomendaciones"
              icono="brujula"
              titulo="Recomendaciones"
              detalle="Opciones según tus restricciones."
            />
            <Acceso
              to="/mi-cuenta/preferencias"
              icono="ajustes"
              titulo="Preferencias"
              detalle="Tiempo, presupuesto e intereses."
            />
            <Acceso
              to="/ruta"
              icono="ruta"
              titulo="Mis viajes"
              detalle="Consulta los borradores de esta sesión."
            />
          </div>
        )}

        {esAdmin && (
          <section className="lp-panel p-6">
            <h2 className="text-xl font-black">Operaciones administrativas</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Tu cuenta tiene el rol Administrador.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink to="/mi-cuenta/destinos" variante="primary">
                Gestionar destinos
              </ButtonLink>
              <ButtonLink to="/mi-cuenta/usuarios" variante="secondary">
                Panel de usuarios
              </ButtonLink>
            </div>
          </section>
        )}

        <section className="lp-panel p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-black">Cuenta y seguridad</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--color-text-muted)]">Correo electrónico</dt>
                  <dd className="mt-1 break-all font-bold">{email}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-muted)]">Rol</dt>
                  <dd className="mt-1 font-bold">{esAdmin ? "Administrador" : "Viajero"}</dd>
                </div>
              </dl>
            </div>
            <Button variante="secondary" onClick={() => setModalAbierto(true)}>
              Cambiar contraseña
            </Button>
          </div>
        </section>

        <section className="lp-panel p-6 sm:p-8" aria-labelledby="titulo-privacidad">
          <h2 id="titulo-privacidad" className="text-xl font-black">Privacidad de tus datos</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Puedes descargar una copia legible de tu información. Si borras la
            cuenta, se cierra la sesión.
          </p>
          <Button
            variante="secondary"
            className="mt-5"
            disabled={exportando}
            onClick={async () => {
              setExportando(true);
              try {
                await descargarMisDatos();
              } catch {
                setBajaError("No pudimos generar la copia de tus datos. Inténtalo de nuevo.");
              } finally {
                setExportando(false);
              }
            }}
          >
            {exportando ? "Preparando…" : "Descargar mis datos"}
          </Button>

          <div className="mt-7 border-t border-[var(--color-border)] pt-6">
            <h3 className="font-black text-[var(--color-danger)]">Borrar cuenta</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              Esta acción borra tu cuenta y cierra la sesión. Escribe
              <strong> BORRAR </strong> para confirmarla.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex-1 text-sm font-bold" htmlFor="confirmacion-baja">
                Confirmación
                <input
                  id="confirmacion-baja"
                  value={confirmacionBaja}
                  onChange={(evento) => setConfirmacionBaja(evento.target.value)}
                  className="mt-2 min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 font-data"
                  placeholder="BORRAR"
                  autoComplete="off"
                />
              </label>
              {/* La interfaz pide BORRAR; el backend sigue esperando ANONIMIZAR. */}
              <Button
                variante="secondary"
                disabled={bajaEnCurso || confirmacionBaja.trim().toUpperCase() !== "BORRAR"}
                onClick={async () => {
                  setBajaEnCurso(true);
                  setBajaError(null);
                  try {
                    await cuentaApi.anonimizarMisDatos();
                    await logout();
                  } catch {
                    setBajaError("No pudimos borrar la cuenta. Inténtalo de nuevo.");
                  } finally {
                    setBajaEnCurso(false);
                  }
                }}
              >
                {bajaEnCurso ? "Procesando…" : "Borrar cuenta"}
              </Button>
            </div>
            {bajaError && (
              <p role="alert" className="mt-3 text-sm font-bold text-[var(--color-danger)]">
                {bajaError}
              </p>
            )}
          </div>
        </section>
      </div>

      {modalAbierto && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto overscroll-contain bg-[var(--color-text)]/70 p-4"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setModalAbierto(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cambiar contraseña"
            className="chuki-account-dialog relative w-full max-w-xl p-1 shadow-[var(--lp-shadow-float)]"
          >
            <button
              ref={cerrarRef}
              type="button"
              onClick={() => setModalAbierto(false)}
              aria-label="Cerrar ventana"
              className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)]"
            >
              <Icono nombre="cerrar" className="h-5 w-5" />
            </button>
            <PasswordForm />
          </div>
        </div>
      )}
    </PrivateShell>
  );
}

function Acceso({
  to,
  icono,
  titulo,
  detalle,
}: {
  to: string;
  icono: "brujula" | "ajustes" | "ruta";
  titulo: string;
  detalle: string;
}) {
  return (
    <Link to={to} className="chuki-account-access__item group p-6">
      <Icono nombre={icono} className="h-6 w-6 text-[var(--color-brand)]" />
      <h2 className="mt-6 text-lg font-black">{titulo}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{detalle}</p>
      <Icono
        nombre="flecha"
        className="mt-6 h-5 w-5 text-[var(--color-action)] transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}
