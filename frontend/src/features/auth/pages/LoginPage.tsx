import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthAlert } from "../components/AuthAlert";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/errors";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const parametros = new URLSearchParams(location.search);
  const justRegistered = parametros.get("registered") === "1";
  const sessionExpired = parametros.get("session") === "expired";

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

      navigate("/mi-cuenta", { replace: true });
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
      subtitle="Ingresa con tu cuenta y vuelve al cuaderno donde guardas tus paradas favoritas."
      seccion="Acceso"
      codigo="01"
    >
      {(justRegistered || sessionExpired) && (
        <div className="mb-5 space-y-3">
          {justRegistered && (
            <AuthAlert tono="ok">
              <strong className="font-black">
                Cuenta creada correctamente.
              </strong>{" "}
              Ya puedes iniciar sesión y comenzar a explorar.
            </AuthAlert>
          )}

          {sessionExpired && (
            <AuthAlert tono="aviso">
              <strong className="font-black">Tu sesión expiró.</strong>{" "}
              Ingresa nuevamente para continuar.
            </AuthAlert>
          )}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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

        {formError && <AuthAlert tono="error">{formError}</AuthAlert>}

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-between gap-4 bg-[#233128] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#FFFDF8] transition hover:bg-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? "Ingresando…" : "Iniciar sesión"}</span>

          <span
            aria-hidden="true"
            className="font-display text-base leading-none transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          >
            {loading ? "…" : "→"}
          </span>
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-[#5B3A29]/15 pt-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A8177]">
          ¿Aún sin bitácora?
        </p>

        <Link
          to="/registro"
          className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#233128] underline decoration-[#C6923B] decoration-2 underline-offset-4 transition hover:text-[#8D4F32]"
        >
          Regístrate →
        </Link>
      </div>
    </AuthShell>
  );
}
