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
      subtitle="Ingresa con tu cuenta y continúa descubriendo la esencia de La Paz."
    >
      {/* INTRO */}
      <div className="mb-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute h-3 w-3 animate-ping rounded-full bg-[#C6923B]/25" />
              <span className="relative h-2 w-2 rounded-full bg-[#C6923B]" />
            </span>

            <p className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#844D31]">
              Tu aventura continúa
            </p>
          </div>

          <span className="hidden text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#8E867B] sm:block">
            La Paz · Bolivia
          </span>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-[#9A5B3C]/40 via-[#C6923B]/20 to-transparent" />
      </div>

      {/* CUENTA CREADA */}
      {justRegistered && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-[1.3rem] border border-[#6F8064]/20 bg-[#EDF2E9]/90 px-4 py-3.5 text-sm leading-6 text-[#304A38] shadow-[0_8px_25px_rgba(47,75,59,0.05)]"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6F8064]/15 text-xs font-black"
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
          className="mb-5 flex items-start gap-3 rounded-[1.3rem] border border-[#C6923B]/25 bg-[#FBF0D9]/95 px-4 py-3.5 text-sm leading-6 text-[#664717] shadow-[0_8px_25px_rgba(198,146,59,0.06)]"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C6923B]/15 text-xs font-black"
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
        className="
          space-y-5

          [&_label]:!mb-2
          [&_label]:!block
          [&_label]:!text-sm
          [&_label]:!font-black
          [&_label]:!text-[#1F2D24]
          [&_label]:!opacity-100

          [&_label_*]:!text-[#1F2D24]
          [&_label_*]:!opacity-100

          [&_input]:!w-full
          [&_input]:!rounded-[1.15rem]
          [&_input]:!border
          [&_input]:!border-[#6B5847]/25
          [&_input]:!bg-[#FFFDF8]
          [&_input]:!px-4
          [&_input]:!py-3.5
          [&_input]:!font-semibold
          [&_input]:!text-[#202921]
          [&_input]:!caret-[#9A5B3C]
          [&_input]:!shadow-[0_8px_24px_rgba(91,58,41,0.06)]
          [&_input]:!outline-none
          [&_input]:!transition
          [&_input]:!duration-300

          [&_input::placeholder]:!text-[#746D63]
          [&_input::placeholder]:!opacity-100

          [&_input:hover]:!border-[#6F8064]/50

          [&_input:focus]:!border-[#2F4B3B]/80
          [&_input:focus]:!bg-white
          [&_input:focus]:!ring-4
          [&_input:focus]:!ring-[#2F4B3B]/10
          [&_input:focus]:!shadow-[0_12px_32px_rgba(47,75,59,0.12)]
          "
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
          className="group relative mt-3 flex w-full overflow-hidden rounded-full bg-[#2F4B3B] px-5 py-3.5 text-sm font-black text-[#FFFDF8] shadow-[0_16px_38px_rgba(47,75,59,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#3C5C48] hover:shadow-[0_20px_46px_rgba(47,75,59,0.30)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {/* Reflejo del botón */}
          <span className="pointer-events-none absolute inset-y-0 -left-24 w-20 rotate-12 bg-white/15 blur-xl transition-all duration-700 group-hover:left-[115%]" />

          <span className="relative flex w-full items-center justify-between">
            <span>{loading ? "Ingresando..." : "Iniciar sesión"}</span>

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
      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#5B3A29]/15" />

        <span className="whitespace-nowrap text-[0.57rem] font-black uppercase tracking-[0.22em] text-[#81796F]">
          Turismo La Paz
        </span>

        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#5B3A29]/15" />
      </div>

      {/* REGISTRO */}
      <p className="text-center text-sm font-medium text-[#5E5A53]">
        ¿Todavía no tienes cuenta?{" "}
        <Link
          to="/registro"
          className="group relative font-black text-[#2F4B3B] transition hover:text-[#854D31]"
        >
          Regístrate
          <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left bg-[#C6923B] transition group-hover:bg-[#9A5B3C]" />
        </Link>
      </p>

      {/* VOLVER */}
      <Link
        to="/"
        className="group mx-auto mt-6 flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#746D63] transition hover:bg-[#2F4B3B]/[0.06] hover:text-[#2F4B3B]"
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