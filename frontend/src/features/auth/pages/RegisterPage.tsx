import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/errors";

interface FormState {
  nombre: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

const INITIAL_FORM: FormState = {
  nombre: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: Partial<FormState> = {};

    if (form.nombre.trim().length < 2) {
      nextErrors.nombre = "Ingresa tu nombre.";
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = "Ingresa un correo válido.";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Usa al menos 8 caracteres.";
    }

    if (form.password !== form.passwordConfirm) {
      nextErrors.passwordConfirm = "Las contraseñas no coinciden.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!validate()) return;

    setLoading(true);

    try {
      const authenticated = await register({
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password_confirm: form.passwordConfirm,
      });

      navigate(authenticated ? "/mi-cuenta" : "/login?registered=1", {
        replace: true,
      });
    } catch (error) {
      setFormError(
        getApiErrorMessage(error, "No se pudo crear la cuenta."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Regístrate como turista y empieza a guardar tus próximas experiencias."
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Nombre"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          value={form.nombre}
          onChange={(event) => updateField("nombre", event.target.value)}
          error={errors.nombre}
        />

        <FormField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          error={errors.email}
        />

        <FormField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          error={errors.password}
        />

        <FormField
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          value={form.passwordConfirm}
          onChange={(event) =>
            updateField("passwordConfirm", event.target.value)
          }
          error={errors.passwordConfirm}
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
          className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Ya tienes una cuenta?{" "}
        <Link to="/login" className="font-bold text-sky-300 hover:text-sky-200">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
