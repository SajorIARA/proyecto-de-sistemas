import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
      subtitle="Ingresa con tu cuenta para continuar explorando La Paz."
    >
      {justRegistered && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
        >
          Cuenta creada correctamente. Ya puedes iniciar sesión.
        </div>
      )}

      {sessionExpired && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
        >
          Tu sesión expiró. Inicia sesión nuevamente.
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

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Todavía no tienes cuenta?{" "}
        <Link
          to="/registro"
          className="font-bold text-amber-300 hover:text-amber-200"
        >
          Regístrate
        </Link>
      </p>
    </AuthShell>
  );
}
