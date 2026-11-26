import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/errors";

function obtenerDestinoSeguro(search: string): string {
  const destino = new URLSearchParams(search).get("redirect");

  return destino?.startsWith("/") && !destino.startsWith("//")
    ? destino
    : "/mi-cuenta";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const justRegistered =
    new URLSearchParams(location.search).get("registered") === "1";

  const sessionExpired =
    new URLSearchParams(location.search).get("session") === "expired";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!email.trim() || !password) {
      setFormError("Completa tu correo y contraseña.");
      return;
    }

    setLoading(true);

    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });

      navigate(obtenerDestinoSeguro(location.search), { replace: true });
    } catch (error) {
      setFormError(
        getApiErrorMessage(error, "Correo o contraseña incorrectos."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresa con tu cuenta y continúa descubriendo la esencia de La Paz."
    >
      {/* INTRO */}
      <div className="mb-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute h-3 w-3 animate-ping rounded-full bg-[var(--color-action)]" />
              <span className="relative h-2 w-2 rounded-full bg-[var(--color-action)]" />
            </span>

            <p className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[var(--color-brand)]">
              Tu aventura continúa
            </p>
          </div>

          <span className="hidden text-[0.58rem] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)] sm:block">
            La Paz · Bolivia
          </span>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-[var(--color-action)] via-[var(--color-action)] to-transparent" />
      </div>

      {/* CUENTA CREADA */}
      {justRegistered && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-[1.3rem] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3.5 text-sm leading-6 text-[var(--color-text)] shadow-[0_8px_25px_rgba(47,75,59,0.05)]"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-xs font-black"
          >
            ✓
          </span>

          <span>
            <strong className="font-black">Cuenta creada correctamente.</strong>{" "}
            Ya puedes iniciar sesión y comenzar a explorar.
          </span>
        </div>
      )}

      {/* SESIÓN EXPIRADA */}
      {sessionExpired && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 border border-[var(--color-action)]/40 bg-[var(--color-action)]/10 px-4 py-3.5 text-sm leading-6 text-[var(--color-action)]"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-action)] text-xs font-black"
          >
            !
          </span>

          <span>
            <strong className="font-black">Tu sesión expiró.</strong>{" "}
            Ingresa nuevamente para continuar.
          </span>
        </div>
      )}

      {/* FORMULARIO */}
      <form
        className="space-y-5"
        onSubmit={handleSubmit}
        noValidate
      >
        <FormField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <FormField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {/* ERROR */}
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[1.3rem] border border-[var(--color-brand)] bg-[var(--color-surface-muted)] px-4 py-3.5 text-sm leading-6 text-[var(--color-brand)] shadow-sm"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-action)] text-xs font-black"
            >
              !
            </span>

            <span>{formError}</span>
          </div>
        )}

        {/* BOTÓN */}
        <button
          type="submit"
          disabled={loading}
          className="group relative mt-3 flex w-full overflow-hidden rounded-full bg-[var(--color-route-strong)] px-5 py-3.5 text-sm font-black text-[var(--color-text)] shadow-[0_16px_38px_rgba(47,75,59,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-route-strong)] hover:shadow-[0_20px_46px_rgba(47,75,59,0.30)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {/* Reflejo del botón */}
          <span className="pointer-events-none absolute inset-y-0 -left-24 w-20 rotate-12 bg-white/15 blur-xl transition-all duration-700 group-hover:left-[115%]" />

          <span className="relative flex w-full items-center justify-between">
            <span>{loading ? "Ingresando..." : "Iniciar sesión"}</span>

            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-action)] text-[var(--lp-night)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.55)] transition duration-300 group-hover:rotate-45 group-hover:scale-105"
            >
              {loading ? "…" : "↗"}
            </span>
          </span>
        </button>
      </form>

      {/* DIVISOR */}
      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--color-surface-muted)]" />

        <span className="whitespace-nowrap text-[0.57rem] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          Turismo La Paz
        </span>

        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--color-surface-muted)]" />
      </div>

      {/* REGISTRO */}
      <p className="text-center text-sm font-medium text-[var(--color-text-muted)]">
        ¿Todavía no tienes cuenta?{" "}
        <Link
          to="/registro"
          className="group relative font-black text-[var(--color-brand)] transition hover:text-[var(--color-brand)]"
        >
          Regístrate
          <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left bg-[var(--color-action)] transition group-hover:bg-[var(--color-action)]" />
        </Link>
      </p>

      {/* VOLVER */}
      <Link
        to="/"
        className="group mx-auto mt-6 flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-route-strong)]/[0.06] hover:text-[var(--color-brand)]"
      >
        <span
          aria-hidden="true"
          className="transition duration-300 group-hover:-translate-x-1"
        >
          ←
        </span>

        Volver al inicio
      </Link>
    </AuthShell>
  );
}
