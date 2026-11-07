/**
 * Medidor de seguridad de la contraseña.
 *
 * Muestra una barra de cuatro tramos y la lista de requisitos reales del
 * backend mientras el usuario escribe. Es informativo: el envío se bloquea
 * con los mensajes de `evaluarContrasena`, no con el puntaje.
 */

import { Icono } from "../../../components/site/Iconos";
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
      className="rounded-[1.15rem] border border-[#5B3A29]/15 bg-[#FFFDF8]/75 px-3.5 py-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#81796F]">
          Seguridad
        </span>

        <span
          className="text-xs font-black"
          style={{ color: nivel.color }}
        >
          {nivel.etiqueta}
        </span>
      </div>

      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((tramo) => (
          <span
            key={tramo}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                tramo < evaluacion.puntaje ? nivel.color : "#E6DDCE",
            }}
          />
        ))}
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {evaluacion.requisitos.map((requisito) => (
          <li
            key={requisito.id}
            className={[
              "flex items-start gap-2 text-[0.7rem] font-semibold leading-5",
              requisito.cumple ? "text-[#2F4B3B]" : "text-[#8B8174]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                requisito.cumple
                  ? "bg-[#2F4B3B]/12 text-[#2F4B3B]"
                  : "bg-[#5B3A29]/8 text-[#9B9184]",
              ].join(" ")}
            >
              {requisito.cumple ? (
                <Icono nombre="check" className="h-3 w-3" />
              ) : (
                <span className="h-px w-1.5 rounded-full bg-current" />
              )}
            </span>

            {requisito.etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}
