/**
 * Aviso de la bitácora de acceso: cuenta creada, sesión expirada o error de
 * credenciales. Comparte el mismo trazo que el resto de la guía impresa
 * (borde izquierdo, símbolo enmarcado) para no parecer una alerta de sistema.
 */

import type { ReactNode } from "react";

type Tono = "ok" | "aviso" | "error";

const TONOS: Record<Tono, string> = {
  ok: "border-[#2F4B3B]/35 bg-[#EDF2E9] text-[#304A38]",
  aviso: "border-[#C6923B]/45 bg-[#FBF0D9] text-[#664717]",
  error: "border-[#9A5B3C]/40 bg-[#F6E8DF] text-[#713A2A]",
};

const SIMBOLOS: Record<Tono, string> = {
  ok: "✓",
  aviso: "!",
  error: "!",
};

export function AuthAlert({
  tono,
  children,
}: {
  tono: Tono;
  children: ReactNode;
}) {
  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 border-l-2 px-3.5 py-3 text-sm leading-6 ${TONOS[tono]}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-current/40 text-[10px] font-black"
      >
        {SIMBOLOS[tono]}
      </span>

      <span>{children}</span>
    </div>
  );
}
