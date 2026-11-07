import { Link } from "react-router-dom";
import { Icono } from "../components/site/Iconos";
import { PublicShell } from "../components/site/PublicShell";

export function NotFoundPage() {
  return (
    <PublicShell>
      <main className="contenedor-medio relative flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          aria-hidden="true"
        >
          <div className="trama-topografica absolute inset-0" />
        </div>

        <p className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#9A5B3C]">
          Error 404
        </p>

        <p
          className="font-editorial mt-4 text-[clamp(4.5rem,14vw,9rem)] leading-none text-[#233128]/15"
          aria-hidden="true"
        >
          404
        </p>

        <span className="mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#2F4B3B] text-[#F3EBDD] shadow-[0_18px_40px_rgba(47,75,59,0.25)]">
          <Icono nombre="brujula" className="h-8 w-8" />
        </span>

        <h1 className="font-display mt-7 text-[clamp(2rem,4.5vw,3rem)] font-black leading-[0.98] tracking-[-0.04em] text-[#233128]">
          Te perdiste en la hoyada.
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#514B43] sm:text-base">
          La página que buscas no existe o cambió de lugar. Vuelve al inicio o
          explora el catálogo para seguir descubriendo La Paz.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-7 py-3.5 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128]"
          >
            Volver al inicio
            <Icono nombre="flecha" className="h-4 w-4" />
          </Link>

          <Link
            to="/destinos"
            className="inline-flex items-center gap-2.5 rounded-full border border-[#2F4B3B]/25 bg-[#FFFDF8] px-7 py-3.5 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] hover:bg-[#2F4B3B] hover:text-[#FFFDF8]"
          >
            <Icono nombre="buscar" className="h-4 w-4" />
            Explorar catálogo
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
