/**
 * Campo de formulario reutilizable del panel de destinos: etiqueta, input (o
 * textarea), pista de ayuda y mensajes de error.
 *
 * Existe para que `DestinoForm` no repita el mismo marcado de input siete
 * veces. El estilo sigue la convención de `PasswordForm`: fondo crema, borde
 * `andes` en foco y borde `terracotta` cuando hay error.
 *
 * Los mensajes se asocian al input con `aria-describedby` y se marca
 * `aria-invalid`, para que el lector de pantalla anuncie el error y no solo lo
 * muestre en color.
 */

import type { ReactNode } from "react";

/**
 * Convenio de ids entre `CampoTexto` y el input que se le pasa como children.
 *
 * El input necesita referenciar al error y a la pista para que el lector de
 * pantalla los anuncie, pero no puede saber sus ids si `CampoTexto` los
 * inventa internamente. Se exportan las dos funciones para que ambos lados
 * calculen el mismo valor.
 */
export const idErrorDe = (id: string): string => `${id}-error`;
export const idPistaDe = (id: string): string => `${id}-pista`;

export function CampoTexto({
  id,
  etiqueta,
  error,
  pista,
  children,
  obligatorio = false,
  contador,
}: {
  id: string;
  etiqueta: string;
  /** Mensajes a mostrar bajo el campo. Si hay alguno, se marca inválido. */
  error?: string[];
  pista?: ReactNode;
  children: ReactNode;
  obligatorio?: boolean;
  /** Indicador `8 / 200` de caracteres usados. */
  contador?: ReactNode;
}) {
  const hayError = (error?.length ?? 0) > 0;
  const idError = idErrorDe(id);
  const idPista = idPistaDe(id);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]"
        >
          {etiqueta}
          {obligatorio && (
            <span className="ml-1 text-[#9A5B3C]" aria-hidden="true">
              *
            </span>
          )}
        </label>

        {contador && (
          <span className="text-[0.65rem] font-bold text-[#8A8177]">
            {contador}
          </span>
        )}
      </div>

      <div className="mt-2.5">{children}</div>

      {!hayError && pista && (
        <p id={idPista} className="mt-2 text-xs leading-5 text-[#746D63]">
          {pista}
        </p>
      )}

      {hayError && (
        <ul
          id={idError}
          className="mt-2 space-y-1 text-xs font-semibold text-[#9A3B2E]"
        >
          {error?.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}
        </ul>
      )}
    </div>
  );
}

/**
 * Clases de los inputs del panel. Se exportan para que `CampoTexto` y los
 * controles que no son texto (checkbox de categorías) compartan exactamente
 * el mismo borde y fondo.
 */
export const claseInput = (hayError: boolean): string =>
  `w-full rounded-2xl border bg-[#F3EBDD]/60 px-4 py-3 text-sm text-[#263029] transition placeholder:text-[#8A8177] ${
    hayError
      ? "border-[#9A5B3C] focus:border-[#9A5B3C]"
      : "border-[#5B3A29]/15 focus:border-[#2F4B3B]"
  }`;