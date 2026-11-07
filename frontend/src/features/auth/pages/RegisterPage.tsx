import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { PasswordStrength } from "../components/PasswordStrength";
import { ToggleContrasena } from "../components/ToggleContrasena";
import { useAuth } from "../context/AuthContext";
import { getApiFieldErrors } from "../utils/errors";
import {
  evaluarContrasena,
  LARGO_MINIMO_CONTRASENA,
} from "../utils/password";

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

const CAMPOS = ["nombre", "email", "password", "passwordConfirm"] as const;

type Campo = (typeof CAMPOS)[number];

const IDS: Record<Campo, string> = {
  nombre: "registro-nombre",
  email: "registro-email",
  password: "registro-password",
  passwordConfirm: "registro-password-confirm",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<Campo, string>>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);

  const evaluacion = evaluarContrasena(form.password, {
    nombre: form.nombre,
    email: form.email,
  });

  function updateField(campo: Campo, value: string) {
    setForm((current) => ({
      ...current,
      [campo]: value,
    }));

    setErrors((current) => ({
      ...current,
      [campo]: undefined,
    }));
  }

  function validarCampo(campo: Campo): string | undefined {
    switch (campo) {
      case "nombre":
        if (!form.nombre.trim()) return "Escribe tu nombre.";
        if (form.nombre.trim().length < 2) return "Usa al menos 2 caracteres.";
        return undefined;

      case "email":
        if (!form.email.trim()) return "Escribe tu correo.";
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
          return "Ingresa un correo válido.";
        }
        return undefined;

      case "password":
        if (!form.password) return "Crea una contraseña.";
        return evaluacion.errores[0];

      case "passwordConfirm":
        if (!form.passwordConfirm) return "Repite tu contraseña.";
        if (form.password !== form.passwordConfirm) {
          return "Las contraseñas no coinciden.";
        }
        return undefined;

      default:
        return undefined;
    }
  }

  function enfocarCampo(campo: Campo) {
    document.getElementById(IDS[campo])?.focus();
  }

  function validarAlSalir(campo: Campo) {
    setErrors((current) => ({
      ...current,
      [campo]: validarCampo(campo),
    }));
  }

  function validarTodo() {
    const siguientes: Partial<Record<Campo, string>> = {};

    for (const campo of CAMPOS) {
      const mensaje = validarCampo(campo);

      if (mensaje) siguientes[campo] = mensaje;
    }

    setErrors(siguientes);

    const primerCampo = CAMPOS.find((campo) => siguientes[campo]);

    if (primerCampo) enfocarCampo(primerCampo);

    return Object.keys(siguientes).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!validarTodo()) return;

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
      const { campos, general } = getApiFieldErrors(error);

      setErrors(campos);
      setFormError(general);

      const primerCampo = CAMPOS.find((campo) => campos[campo]);

      if (primerCampo) enfocarCampo(primerCampo);
    } finally {
      setLoading(false);
    }
  }

  const confirmacionCoincide =
    form.passwordConfirm.length > 0 &&
    form.password === form.passwordConfirm;

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
      <form
        className="space-y-5"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading}
      >
        {/* TUS DATOS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#9A5B3C]">
              01
            </span>

            <span className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#5E5A53]">
              Tus datos
            </span>

            <span className="h-px flex-1 bg-gradient-to-r from-[#5B3A29]/15 to-transparent" />
          </div>

          <FormField
            id={IDS.nombre}
            label="Nombre"
            type="text"
            autoComplete="name"
            autoFocus
            required
            placeholder="Tu nombre"
            maxLength={150}
            enterKeyHint="next"
            value={form.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
            onBlur={() => validarAlSalir("nombre")}
            error={errors.nombre}
          />

          <FormField
            id={IDS.email}
            label="Correo electrónico"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="tu@correo.com"
            maxLength={254}
            enterKeyHint="next"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            onBlur={() => validarAlSalir("email")}
            error={errors.email}
          />
        </div>

        {/* SEGURIDAD */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#9A5B3C]">
              02
            </span>

            <span className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#5E5A53]">
              Seguridad
            </span>

            <span className="h-px flex-1 bg-gradient-to-r from-[#5B3A29]/15 to-transparent" />
          </div>

          <FormField
            id={IDS.password}
            label="Contraseña"
            type={verPassword ? "text" : "password"}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres`}
            maxLength={128}
            enterKeyHint="next"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            onBlur={() => validarAlSalir("password")}
            error={errors.password}
            trailing={
              <ToggleContrasena
                visible={verPassword}
                controls={IDS.password}
                onToggle={() => setVerPassword((visible) => !visible)}
              />
            }
            meta={
              form.password ? (
                <PasswordStrength evaluacion={evaluacion} />
              ) : undefined
            }
          />

          <FormField
            id={IDS.passwordConfirm}
            label="Confirmar contraseña"
            type={verConfirmacion ? "text" : "password"}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="Repite tu contraseña"
            maxLength={128}
            enterKeyHint="done"
            value={form.passwordConfirm}
            onChange={(event) =>
              updateField("passwordConfirm", event.target.value)
            }
            onBlur={() => validarAlSalir("passwordConfirm")}
            error={errors.passwordConfirm}
            hint={
              confirmacionCoincide ? "Las contraseñas coinciden." : undefined
            }
            trailing={
              <ToggleContrasena
                visible={verConfirmacion}
                controls={IDS.passwordConfirm}
                onToggle={() => setVerConfirmacion((visible) => !visible)}
              />
            }
          />
        </div>

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
              <Icono nombre="alerta" className="h-4 w-4" />
            </span>

            <span>{formError}</span>
          </div>
        )}

        {/* BOTÓN */}
        <div className="space-y-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full overflow-hidden rounded-full bg-[#2F4B3B] px-5 py-3.5 text-sm font-black text-[#FFFDF8] shadow-[0_16px_38px_rgba(47,75,59,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#3C5C48] hover:shadow-[0_20px_46px_rgba(47,75,59,0.30)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
          >
            {/* Reflejo */}
            <span className="pointer-events-none absolute inset-y-0 -left-24 w-20 rotate-12 bg-white/15 blur-xl transition-all duration-700 group-hover:left-[115%]" />

            <span className="relative flex w-full items-center justify-between">
              <span>
                {loading ? "Creando cuenta…" : "Crear cuenta"}
              </span>

              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8C16A] text-[#28352C] shadow-[inset_0_1px_1px_rgba(255,255,255,0.55)] transition duration-300 group-hover:rotate-45 group-hover:scale-105"
              >
                {loading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#28352C]/30 border-t-[#28352C]" />
                ) : (
                  <Icono nombre="flechaDiagonal" className="h-4 w-4" />
                )}
              </span>
            </span>
          </button>

          <p className="flex items-start gap-2 px-1 text-[0.68rem] font-medium leading-5 text-[#81796F]">
            <span aria-hidden="true" className="mt-px">
              ⓘ
            </span>
            <span>
              <span aria-hidden="true" className="text-[#9A5B3C]">
                *
              </span>{" "}
              Campos obligatorios. Usaremos tu correo solo para tu cuenta y
              tus preferencias de viaje.
            </span>
          </p>
        </div>
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
          <Icono nombre="flecha" className="h-3.5 w-3.5 rotate-180" />
        </span>

        Volver al inicio
      </Link>
    </AuthShell>
  );
}
