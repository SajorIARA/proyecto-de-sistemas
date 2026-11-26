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
import { Button } from "../../../design-system/components/Button";

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
    <section className="overflow-hidden bg-[var(--color-surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-5 sm:px-8">
        <span className="h-1 w-8 bg-[var(--color-route)]" aria-hidden="true" />

        <h2 className="text-lg font-black">
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
                className="block text-xs font-black text-[var(--color-text)]"
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
                className={`mt-2.5 min-h-12 w-full border bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] transition ${
                  mensajes.length > 0
                    ? "border-[var(--color-danger)]"
                    : "border-[var(--color-border-strong)] focus:border-[var(--color-brand)]"
                }`}
              />

              {campo.hint && mensajes.length === 0 && (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">{campo.hint}</p>
              )}

              {mensajes.length > 0 && (
                <ul
                  id={idError}
                  className="mt-2 space-y-1 text-xs font-semibold text-[var(--color-danger)]"
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
            className="border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-danger)]"
          >
            {error}
          </p>
        )}

        {/* Confirmación */}
        {exito && (
          <p
            role="status"
            className="border border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-brand)]"
          >
            Contraseña actualizada. Tu sesión sigue activa.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Button
            type="submit"
            disabled={pendiente || vacio}
            variante="primary"
          >
            {pendiente ? "Guardando…" : "Actualizar contraseña"}
          </Button>

          {vacio && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Completa los tres campos para continuar.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
