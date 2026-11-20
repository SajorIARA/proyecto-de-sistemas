import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthAlert } from "../components/AuthAlert";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { PasswordStrength } from "../components/PasswordStrength";
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

function ToggleContrasena({
  visible,
  controls,
  onToggle,
}: {
  visible: boolean;
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-controls={controls}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#746D63] underline decoration-[#5B3A29]/30 underline-offset-4 transition hover:text-[#2F4B3B] hover:decoration-[#2F4B3B]/50"
    >
      {visible ? "Ocultar" : "Ver"}
    </button>
  );
}

function EncabezadoSeccion({
  numero,
  titulo,
  detalle,
}: {
  numero: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#5B3A29]/15 pb-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
        {numero} · {titulo}
      </p>

      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#A39B8F]">
        {detalle}
      </p>
    </div>
  );
}

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
      subtitle="Crea tu cuenta y arma tu propia bitácora de La Paz: naturaleza, cultura y experiencias a tu medida."
      seccion="Alta"
      codigo="02"
    >
      <form
        className="space-y-6"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading}
      >
        <div className="space-y-4">
          <EncabezadoSeccion
            numero="01"
            titulo="Tus datos"
            detalle="Nombre y correo"
          />

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

        <div className="space-y-4">
          <EncabezadoSeccion
            numero="02"
            titulo="Seguridad"
            detalle="Llave de la bitácora"
          />

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

        {formError && <AuthAlert tono="error">{formError}</AuthAlert>}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-between gap-4 bg-[#233128] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#FFFDF8] transition hover:bg-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{loading ? "Creando cuenta…" : "Crear cuenta"}</span>

            <span
              aria-hidden="true"
              className="font-display text-base leading-none transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            >
              {loading ? "…" : "→"}
            </span>
          </button>

          <p className="flex items-start gap-2 text-[10px] leading-5 text-[#8A8177]">
            <span aria-hidden="true" className="mt-px text-[#9A5B3C]">
              *
            </span>
            <span>
              Campos obligatorios. Usaremos tu correo solo para tu cuenta y
              tus preferencias de viaje.
            </span>
          </p>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-[#5B3A29]/15 pt-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A8177]">
          ¿Ya tienes bitácora?
        </p>

        <Link
          to="/login"
          className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#233128] underline decoration-[#C6923B] decoration-2 underline-offset-4 transition hover:text-[#8D4F32]"
        >
          Inicia sesión →
        </Link>
      </div>
    </AuthShell>
  );
}
