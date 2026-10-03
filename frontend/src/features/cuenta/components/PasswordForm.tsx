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
    <section className="overflow-hidden rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.08)]">
      <div className="flex items-center gap-3 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
        <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />

        <h2 className="text-lg font-black tracking-tight text-[#233128]">
          Seguridad de la cuenta
        </h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 px-6 py-7 sm:px-8">
        {CAMPOS.map((campo) => {
          const mensajes = apiError?.mensajesDe(campo.name) ?? [];
          const idError = `${campo.name}-error`;

          return (
            <div key={campo.name}>
              <label
                htmlFor={campo.name}
                className="block text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]"
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
                className={`mt-2.5 w-full rounded-2xl border bg-[#F3EBDD]/60 px-4 py-3 text-sm text-[#263029] transition placeholder:text-[#8A8177] ${
                  mensajes.length > 0
                    ? "border-[#9A5B3C] focus:border-[#9A5B3C]"
                    : "border-[#5B3A29]/15 focus:border-[#2F4B3B]"
                }`}
              />

              {campo.hint && mensajes.length === 0 && (
                <p className="mt-2 text-xs text-[#746D63]">{campo.hint}</p>
              )}

              {mensajes.length > 0 && (
                <ul
                  id={idError}
                  className="mt-2 space-y-1 text-xs font-semibold text-[#9A3B2E]"
                >
                  {mensajes.map((mensaje) => (
                    <li key={mensaje}>{mensaje}</li>
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
            className="rounded-2xl border border-[#9A3B2E]/25 bg-[#9A3B2E]/[0.07] px-4 py-3 text-sm font-semibold text-[#9A3B2E]"
          >
            {error}
          </p>
        )}

        {/* Confirmación */}
        {exito && (
          <p
            role="status"
            className="rounded-2xl border border-[#2F4B3B]/25 bg-[#2F4B3B]/[0.07] px-4 py-3 text-sm font-semibold text-[#2F4B3B]"
          >
            Contraseña actualizada. Tu sesión sigue activa.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={pendiente || vacio}
            className="inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pendiente ? "Guardando…" : "Actualizar contraseña"}
          </button>

          {vacio && (
            <p className="text-xs text-[#746D63]">
              Completa los tres campos para continuar.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
