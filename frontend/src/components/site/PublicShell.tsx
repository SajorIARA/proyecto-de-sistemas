/**
 * Estructura común de las páginas públicas internas (catálogo, detalle y
 * 404): cabecera fija, contenido y pie del sitio.
 *
 * La portada no la usa porque su hero ocupa el viewport completo y la
 * cabecera flota encima.
 */

import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EBDD] text-[#263029]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#FFFDF8] focus:px-5 focus:py-3 focus:text-sm focus:font-black focus:text-[#233128] focus:shadow-xl"
      >
        Saltar al contenido
      </a>

      <SiteHeader variante="fija" />

      <div id="contenido" className="flex flex-1 flex-col">
        {children}
      </div>

      <SiteFooter />
    </div>
  );
}
