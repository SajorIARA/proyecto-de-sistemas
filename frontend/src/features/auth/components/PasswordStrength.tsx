/**
 * Medidor de seguridad de la contraseña.
 *
 * Cuatro tramos y la lista de requisitos reales del backend mientras el
 * usuario escribe. Es informativo: el envío se bloquea con los mensajes de
 * `evaluarContrasena`, no con el puntaje.
 */

import {
  nivelContrasena,
  type EvaluacionContrasena,
} from "../utils/password";

export function PasswordStrength({
  evaluacion,
}: {
  evaluacion: EvaluacionContrasena;
}) {
  const nivel = nivelContrasena(evaluacion.puntaje);

  return (
    <div
      className="border border-[#5B3A29]/15 bg-[#F3EBDD]/50 px-3.5 py-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8A8177]">
          Seguridad de la clave
        </span>

        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: nivel.color }}>
          {nivel.etiqueta}
        </span>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((tramo) => (
          <span
            key={tramo}
            className="h-1 flex-1 transition-colors duration-300"
            style={{
              backgroundColor:
                tramo < evaluacion.puntaje ? nivel.color : "#E3D9C8",
            }}
          />
        ))}
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {evaluacion.requisitos.map((requisito) => (
          <li
            key={requisito.id}
            className={[
              "flex items-start gap-2 text-[10px] font-medium leading-5",
              requisito.cumple ? "text-[#2F4B3B]" : "text-[#8B8174]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center border text-[9px] font-black",
                requisito.cumple
                  ? "border-[#2F4B3B]/45 bg-[#2F4B3B]/10 text-[#2F4B3B]"
                  : "border-[#5B3A29]/20 text-[#9B9184]",
              ].join(" ")}
            >
              {requisito.cumple ? "✓" : ""}
            </span>

            {requisito.etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}
