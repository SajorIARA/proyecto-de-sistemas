/**
 * Marco de acceso y registro.
 *
 * Dos páginas del mismo cuaderno de ruta: a la izquierda el Illimani con la
 * luna llena y los datos de la bitácora; a la derecha el formulario impreso
 * sobre papel crema. Sin tarjetas de vidrio ni degradados radiales: las
 * líneas, los números de sección y la tipografía hacen el trabajo.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import { FOTO_ACCESO } from "../../../config/imagenesSitio";

interface AuthShellProps {
  title: string;
  subtitle: string;
  /** Sección de la guía: "Acceso" o "Alta". */
  seccion: string;
  /** Número de la sección, para el índice de la cabecera. */
  codigo: string;
  children: ReactNode;
}

function DatoBitacora({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#E9DFC9]/50">
        {etiqueta}
      </dt>
      <dd className="mt-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E9DFC9]">
        {valor}
      </dd>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  seccion,
  codigo,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#F3EBDD] text-[#263029]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* =========================================================
            PANEL VISUAL · ILLIMANI
        ========================================================== */}
        <section className="relative hidden overflow-hidden bg-[#101710] lg:block">
          <img
            src={FOTO_ACCESO.src}
            alt={FOTO_ACCESO.alt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[88%_center]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#0C120D] via-[#0F1611]/45 to-[#101710]/15" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C120D]/55 via-transparent to-transparent" />
          <div className="trama-topografica pointer-events-none absolute inset-0 opacity-20" />

          <div className="relative z-10 flex min-h-screen flex-col justify-between p-10 xl:p-14 2xl:p-16">
            <div className="flex items-start justify-between gap-6">
              <Link
                to="/"
                className="group flex items-center gap-3.5 text-[#F3EBDD]"
              >
                <span className="flex h-11 w-11 items-center justify-center border border-[#E9DFC9]/30 bg-[#101710]/40 text-[#E9DFC9] transition group-hover:bg-[#101710]/65">
                  <Icono nombre="montana" className="h-5 w-5" />
                </span>

                <span>
                  <span className="block font-display text-lg font-black leading-none tracking-tight text-[#FFFDF8]">
                    Turismo{" "}
                    <span className="font-editorial text-xl font-normal italic text-[#E8C16A]">
                      La Paz
                    </span>
                  </span>

                  <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.26em] text-[#E9DFC9]/55">
                    Guía de campo · Bolivia
                  </span>
                </span>
              </Link>

              <p className="text-right font-mono text-[9px] uppercase leading-5 tracking-[0.2em] text-[#E9DFC9]/55">
                16°30′ S
                <br />
                68°09′ O
              </p>
            </div>

            <div className="max-w-xl pb-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#E8C16A]">
                Bitácora de viaje · N.º 01
              </p>

              <p className="mt-5 font-display text-[clamp(2.7rem,4.4vw,4.5rem)] font-black leading-[0.88] tracking-[-0.05em] text-[#FFFDF8]">
                La altura también
                <span className="block font-editorial font-normal italic tracking-[-0.02em] text-[#E8C16A]">
                  se recorre.
                </span>
              </p>

              <p className="mt-6 max-w-md text-sm leading-7 text-[#E9DFC9]/70">
                Abre tu cuaderno de ruta: guarda destinos, ajusta tus
                preferencias y vuelve a La Paz cuando quieras.
              </p>

              <dl className="mt-10 flex max-w-md flex-wrap gap-x-9 gap-y-4 border-t border-[#E9DFC9]/20 pt-6">
                <DatoBitacora etiqueta="Altitud" valor="3.600 m" />
                <DatoBitacora etiqueta="Illimani" valor="6.438 m" />
                <DatoBitacora etiqueta="Cielo" valor="Luna llena" />
              </dl>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E9DFC9]/15 pt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-[#E9DFC9]/45">
              <span>Illimani · Cordillera Real</span>
              <span>Luna llena sobre la hoyada</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            FORMULARIO SOBRE PAPEL
        ========================================================== */}
        <section className="relative flex min-h-screen flex-col bg-[#F3EBDD]">
          <div className="flex items-center justify-between gap-4 border-b border-[#5B3A29]/15 px-5 py-4 sm:px-8 lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-[#233128]"
            >
              <span className="flex h-9 w-9 items-center justify-center bg-[#233128] text-[#F3EBDD]">
                <Icono nombre="montana" className="h-4 w-4" />
              </span>

              <span className="font-display text-sm font-black leading-none tracking-tight">
                Turismo{" "}
                <span className="font-editorial text-base font-normal italic text-[#9A5B3C]">
                  La Paz
                </span>
              </span>
            </Link>

            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#746D63]">
              La Paz · Bolivia
            </p>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-20 opacity-[0.04] lg:block"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #5B3A29 0px, #5B3A29 1px, transparent 1px, transparent 13px)",
              }}
            />

            <div className="relative w-full max-w-[470px]">
              <div className="flex items-center justify-between gap-4 border-b border-[#5B3A29]/20 pb-3 font-mono text-[9px] uppercase tracking-[0.22em] text-[#746D63]">
                <span>Turismo La Paz</span>
                <span className="text-[#9A5B3C]">
                  {codigo} / {seccion}
                </span>
              </div>

              <h1 className="mt-8 font-display text-[clamp(2.2rem,3.6vw,3.2rem)] font-black leading-[0.92] tracking-[-0.045em] text-[#233128]">
                {title}
              </h1>

              <p className="mt-4 max-w-md text-sm leading-7 text-[#5C574E]">
                {subtitle}
              </p>

              <div className="relative mt-8 border border-[#5B3A29]/25 bg-[#FFFDF8] p-5 sm:p-7">
                <span className="absolute -top-[9px] right-4 bg-[#F3EBDD] px-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#8A8177]">
                  Formulario · {codigo}
                </span>

                {children}
              </div>

              <Link
                to="/"
                className="group mt-7 inline-flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#746D63] transition hover:text-[#233128]"
              >
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:-translate-x-0.5"
                >
                  ←
                </span>
                Volver a la portada
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
