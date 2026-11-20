/**
 * Formulario de cambio de contraseña (`POST /api/auth/password/change/`).
 *
 * Toda la validación fuerte la hace Django: `PasswordChangeSerializer`
 * comprueba la contraseña actual, que las nuevas coincidan y pasa los
 * validadores de `django.contrib.auth.password_validation` (mínimo 8
 * caracteres, no solo numérica, no parecida al email o al nombre). Los
 * mensajes llegan en español y por campo, así que se pintan bajo el input
 * correspondiente en vez de inventar reglas duplicadas en el frontend.
 */

import { useState, type FormEvent } from "react";
import { useCambiarPassword } from "../hooks/useCuenta";
import type { CampoPassword } from "../api/cuentaApi";

interface CampoFormulario {
  name: CampoPassword;
  label: string;
  autoComplete: string;
  hint?: string;
}

const CAMPOS: CampoFormulario[] = [
  {
    name: "current_password",
    label: "Contraseña actual",
    autoComplete: "current-password",
  },
  {
    name: "new_password",
    label: "Nueva contraseña",
    autoComplete: "new-password",
    hint: "Mínimo 8 caracteres. El resto de reglas las valida el sistema.",
  },
  {
    name: "new_password_confirm",
    label: "Repetir nueva contraseña",
    autoComplete: "new-password",
  },
];

export function PasswordForm() {
  const [valores, setValores] = useState<Record<CampoPassword, string>>({
    current_password: "",
    new_password: "",
    new_password_confirm: "",
  });

  const { cambiar, exito, error, apiError, pendiente, limpiar } =
    useCambiarPassword();

  const vacio = Object.values(valores).every((valor) => valor.trim() === "");

  function actualizar(campo: CampoPassword, valor: string) {
    setValores((anterior) => ({ ...anterior, [campo]: valor }));

    // Cualquier edición esconde el resultado anterior para no dejar un
    // "contraseña actualizada" colgado mientras el usuario sigue escribiendo.
    if (exito || apiError) {
      limpiar();
    }
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const ok = await cambiar(valores);

    if (ok) {
      // No se limpian los tokens: el backend no invalida los tokens
      // emitidos, así que la sesión sigue vigente.
      setValores({
        current_password: "",
        new_password: "",
        new_password_confirm: "",
      });
    }
  }

  return (
    <section className="overflow-hidden border border-[#5B3A29]/20 bg-[#FFFDF8]">
      <div className="border-b border-[#5B3A29]/15 px-5 py-5 pr-16 sm:px-7 sm:pr-16">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
          Formulario · Seguridad
        </p>

        <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
          Seguridad de la cuenta
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 px-5 py-6 sm:px-7"
      >
        {CAMPOS.map((campo) => {
          const mensajes = apiError?.mensajesDe(campo.name) ?? [];
          const idError = `${campo.name}-error`;

          return (
            <div key={campo.name}>
              <label
                htmlFor={campo.name}
                className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#5C574E]"
              >
                {campo.label}
              </label>

              <input
                id={campo.name}
                name={campo.name}
                type="password"
                autoComplete={campo.autoComplete}
                value={valores[campo.name]}
                onChange={(evento) =>
                  actualizar(campo.name, evento.target.value)
                }
                aria-invalid={mensajes.length > 0}
                aria-describedby={mensajes.length > 0 ? idError : undefined}
                className={`w-full rounded-none border bg-[#FFFDF8] px-3.5 py-3 text-[0.95rem] font-medium text-[#242B25] caret-[#9A5B3C] outline-none transition placeholder:font-normal placeholder:text-[#968C7E] ${
                  mensajes.length > 0
                    ? "border-[#9A5B3C]/60 focus:border-[#9A5B3C] focus:ring-1 focus:ring-[#9A5B3C]/20"
                    : "border-[#5B3A29]/25 hover:border-[#2F4B3B]/55 focus:border-[#2F4B3B] focus:ring-1 focus:ring-[#2F4B3B]/25"
                }`}
              />

              {campo.hint && mensajes.length === 0 && (
                <p className="mt-1.5 text-[11px] leading-5 text-[#8A8177]">
                  {campo.hint}
                </p>
              )}

              {mensajes.length > 0 && (
                <ul
                  id={idError}
                  className="mt-2 border-l-2 border-[#9A5B3C]/50 bg-[#F6E8DF]/60 px-3 py-2 text-[11px] font-semibold leading-5 text-[#713A2A]"
                >
                  {mensajes.map((mensaje) => (
                    <li key={mensaje} className="flex items-start gap-1.5">
                      <span aria-hidden="true">!</span>
                      {mensaje}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Error global (red, 401, 500…) */}
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 border-l-2 border-[#9A5B3C]/50 bg-[#F6E8DF]/60 px-3 py-2.5 text-xs font-semibold leading-6 text-[#713A2A]"
          >
            <span aria-hidden="true">!</span>
            {error}
          </p>
        )}

        {/* Confirmación */}
        {exito && (
          <p
            role="status"
            className="flex items-start gap-2 border-l-2 border-[#2F4B3B]/45 bg-[#EDF2E9] px-3 py-2.5 text-xs font-semibold leading-6 text-[#304A38]"
          >
            <span aria-hidden="true">✓</span>
            Contraseña actualizada. Tu sesión sigue activa.
          </p>
        )}

        <div className="border-t border-[#5B3A29]/15 pt-5">
          <button
            type="submit"
            disabled={pendiente || vacio}
            className="group flex w-full items-center justify-between gap-4 bg-[#233128] px-5 py-4 text-left font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8] transition hover:bg-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pendiente ? "Guardando…" : "Actualizar contraseña"}
            <span
              aria-hidden="true"
              className="font-display text-base transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
            >
              {pendiente ? "…" : "→"}
            </span>
          </button>

          {vacio && (
            <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-[#968C7E]">
              Completa los tres campos para continuar.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
