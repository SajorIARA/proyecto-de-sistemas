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
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
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
      title="Comienza tu viaje"
      subtitle="Crea tu cuenta y descubre La Paz a través de su naturaleza, cultura y experiencias."
    >
      {/* INTRO */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute h-3 w-3 animate-ping rounded-full bg-[#C6923B]/25" />
              <span className="relative h-2 w-2 rounded-full bg-[#C6923B]" />
            </span>

            <p className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#844D31]">
              Crea tu experiencia
            </p>
          </div>

          <span className="hidden text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#8E867B] sm:block">
            La Paz · Bolivia
          </span>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-[#9A5B3C]/40 via-[#C6923B]/20 to-transparent" />
      </div>

      {/* FORMULARIO */}
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Nombre"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          value={form.nombre}
          onChange={(event) =>
            updateField("nombre", event.target.value)
          }
          error={errors.nombre}
        />

        <FormField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={form.email}
          onChange={(event) =>
            updateField("email", event.target.value)
          }
          error={errors.email}
        />

        <FormField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={(event) =>
            updateField("password", event.target.value)
          }
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

        {/* ERROR GENERAL */}
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[1.3rem] border border-[#9A5B3C]/20 bg-[#F6E8DF]/95 px-4 py-3.5 text-sm leading-6 text-[#713A2A] shadow-sm"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#9A5B3C]/15 text-xs font-black"
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
          className="group relative mt-2 flex w-full overflow-hidden rounded-full bg-[#2F4B3B] px-5 py-3.5 text-sm font-black text-[#FFFDF8] shadow-[0_16px_38px_rgba(47,75,59,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#3C5C48] hover:shadow-[0_20px_46px_rgba(47,75,59,0.30)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {/* Reflejo */}
          <span className="pointer-events-none absolute inset-y-0 -left-24 w-20 rotate-12 bg-white/15 blur-xl transition-all duration-700 group-hover:left-[115%]" />

          <span className="relative flex w-full items-center justify-between">
            <span>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </span>

            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8C16A] text-[#28352C] shadow-[inset_0_1px_1px_rgba(255,255,255,0.55)] transition duration-300 group-hover:rotate-45 group-hover:scale-105"
            >
              {loading ? "…" : "↗"}
            </span>
          </span>
        </button>
      </form>

      {/* DIVISOR */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#5B3A29]/15" />

        <span className="whitespace-nowrap text-[0.57rem] font-black uppercase tracking-[0.22em] text-[#81796F]">
          Turismo La Paz
        </span>

        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#5B3A29]/15" />
      </div>

      {/* LOGIN */}
      <p className="text-center text-sm font-medium text-[#5E5A53]">
        ¿Ya tienes una cuenta?{" "}
        <Link
          to="/login"
          className="group relative font-black text-[#2F4B3B] transition hover:text-[#854D31]"
        >
          Inicia sesión

          <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left bg-[#C6923B] transition group-hover:bg-[#9A5B3C]" />
        </Link>
      </p>

      {/* VOLVER */}
      <Link
        to="/"
        className="group mx-auto mt-5 flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#746D63] transition hover:bg-[#2F4B3B]/[0.06] hover:text-[#2F4B3B]"
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