import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
<<<<<<< HEAD
    <main className="min-h-screen overflow-hidden bg-[#F3EBDD] text-[#263029]">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        {/* =========================================================
            PANEL VISUAL · ILLIMANI
        ========================================================== */}
        <section className="relative hidden min-h-screen overflow-hidden lg:block">
          {/* Fotografía */}
          <div
            className="absolute inset-0 scale-[1.02] bg-cover bg-center"
            style={{
              backgroundImage: 'url("/images/illimani-login.webp")',
            }}
          />

          {/* Overlay natural */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#18251D]/95 via-[#2F4B3B]/70 to-[#2F4B3B]/22" />

          {/* Profundidad inferior */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#20170F]/88 via-transparent to-[#231A13]/18" />

          {/* Luces ambientales */}
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-[32rem] w-[32rem] rounded-full bg-[#C6923B]/25 blur-[150px]" />

          <div className="pointer-events-none absolute -right-36 top-1/4 h-96 w-96 rounded-full bg-[#9A5B3C]/15 blur-[140px]" />

          {/* Patrón andino */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `
                linear-gradient(
                  45deg,
                  transparent 46%,
                  rgba(255,255,255,.8) 47%,
                  rgba(255,255,255,.8) 49%,
                  transparent 50%
                ),
                linear-gradient(
                  -45deg,
                  transparent 46%,
                  rgba(255,255,255,.8) 47%,
                  rgba(255,255,255,.8) 49%,
                  transparent 50%
                )
              `,
              backgroundSize: "54px 54px",
            }}
          />

          {/* LA PAZ decorativo */}
          <div className="pointer-events-none absolute -left-3 top-1/2 -translate-y-1/2 select-none">
            <span className="block text-[clamp(8rem,17vw,16rem)] font-black leading-[0.7] tracking-[-0.09em] text-[#F5EFE4]/[0.07]">
              LA
            </span>

            <span className="block text-[clamp(8rem,17vw,16rem)] font-black leading-[0.7] tracking-[-0.09em] text-[#F5EFE4]/[0.07]">
              PAZ
            </span>
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-between p-10 xl:p-14 2xl:p-16">
            {/* Marca */}
            <Link
              to="/"
              className="group flex w-fit items-center gap-3 text-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E9DFC9]/25 bg-[#F5EFE4]/10 text-lg shadow-lg backdrop-blur-xl transition duration-300 group-hover:bg-[#F5EFE4]/20">
                ⛰
              </span>

              <div>
                <p className="text-base font-black tracking-tight">
                  Turismo{" "}
                  <span className="font-medium text-[#E7B75F]">La Paz</span>
                </p>

                <p className="mt-0.5 text-[0.58rem] font-bold uppercase tracking-[0.24em] text-white/45">
                  Bolivia
                </p>
              </div>
            </Link>

            {/* Mensaje */}
            <div className="max-w-2xl pb-6">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#E9DFC9]/15 bg-[#1A241C]/30 px-4 py-2 backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-[#E7B75F] shadow-[0_0_18px_rgba(231,183,95,0.9)]" />

                <span className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#F1D79D]">
                  Entre tierra, cielo y memoria
                </span>
              </div>

              <h1 className="max-w-2xl text-5xl font-black leading-[0.92] tracking-[-0.045em] text-[#FFFDF8] xl:text-6xl 2xl:text-7xl">
                Donde los Andes
                <span className="block text-[#E8D8B7]">
                  cuentan historias.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-[#F5EFE4]/70 xl:text-lg xl:leading-8">
                Descubre una ciudad abrazada por montañas, mercados,
                tradiciones y caminos que conservan la esencia cultural de
                Bolivia.
              </p>

              {/* Datos */}
              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-[1.4rem] border border-[#E9DFC9]/10 bg-[#F5EFE4]/[0.07] p-4 backdrop-blur-xl">
                  <p className="text-2xl font-black text-[#FFFDF8]">3.600</p>
                  <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#E8D8B7]/65">
                    m s. n. m.
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-[#E9DFC9]/10 bg-[#F5EFE4]/[0.07] p-4 backdrop-blur-xl">
                  <p className="text-2xl font-black text-[#FFFDF8]">6</p>
                  <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#E8D8B7]/65">
                    experiencias
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-[#E9DFC9]/10 bg-[#F5EFE4]/[0.07] p-4 backdrop-blur-xl">
                  <p className="text-2xl font-black text-[#FFFDF8]">∞</p>
                  <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#E8D8B7]/65">
                    historias
                  </p>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div className="flex items-end justify-between border-t border-[#F5EFE4]/10 pt-5">
              <div>
                <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#E7B75F]">
                  Illimani
                </p>

                <p className="mt-1 text-xs text-white/45">
                  Guardián natural de La Paz
                </p>
              </div>

              <p className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C6923B]" />
                Explora · descubre · conecta
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            PANEL DERECHO
        ========================================================== */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F3EBDD] px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          {/* Luces de fondo */}
          <div className="pointer-events-none absolute -right-36 -top-36 h-[28rem] w-[28rem] rounded-full bg-[#D8AE5B]/12 blur-[130px]" />

          <div className="pointer-events-none absolute -bottom-44 -left-32 h-[32rem] w-[32rem] rounded-full bg-[#6F8064]/12 blur-[140px]" />

          {/* Textura lateral */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-24 opacity-[0.025]"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  #5B3A29 0px,
                  #5B3A29 2px,
                  transparent 2px,
                  transparent 14px
                )
              `,
            }}
          />

          <div className="relative z-10 w-full max-w-[480px]">
            {/* Logo móvil */}
            <div className="mb-10 lg:hidden">
              <Link
                to="/"
                className="flex w-fit items-center gap-3 text-[#26362C]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F4B3B] text-white shadow-lg">
                  ⛰
                </span>

                <div>
                  <p className="text-base font-black">Turismo La Paz</p>
                  <p className="text-[0.55rem] font-black uppercase tracking-[0.2em] text-[#8F5437]">
                    Bolivia
                  </p>
                </div>
              </Link>
            </div>

            {/* Etiqueta */}
            <div className="mb-5 flex items-center gap-3">
              <span className="h-[2px] w-10 bg-[#9A5B3C]" />

              <span className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#8D4F32]">
                Bienvenido viajero
              </span>
            </div>

            {/* Título */}
            <div className="mb-8">
              <h2 className="max-w-md text-4xl font-black leading-[0.95] tracking-[-0.045em] text-[#233128] sm:text-5xl">
                {title}
              </h2>

              <p className="mt-5 max-w-md text-sm font-medium leading-7 text-[#514B43] sm:text-base">
                {subtitle}
              </p>
            </div>

            {/* =====================================================
                TARJETA DE VIDRIO
            ====================================================== */}
            <div className="relative overflow-hidden rounded-[2.75rem] rounded-bl-[1.35rem] border border-white/90 bg-white/78 p-6 shadow-[0_35px_90px_rgba(72,55,38,0.14)] ring-1 ring-[#5B3A29]/[0.04] backdrop-blur-2xl sm:p-8">
              {/* Reflejo superior */}
              <div className="pointer-events-none absolute inset-x-10 top-1 h-20 rounded-full bg-gradient-to-b from-white/95 via-white/35 to-transparent blur-2xl" />

              {/* Reflejo lateral */}
              <div className="pointer-events-none absolute -right-16 top-24 h-48 w-32 rotate-12 rounded-full bg-white/55 blur-3xl" />

              {/* Barra cultural */}
              <div className="absolute inset-x-10 top-0 flex h-[3px] overflow-hidden rounded-b-full">
                <span className="flex-1 bg-[#2F4B3B]" />
                <span className="flex-1 bg-[#C6923B]" />
                <span className="flex-1 bg-[#9A5B3C]" />
                <span className="flex-1 bg-[#6F8064]" />
              </div>

              {/* SOLO UNA VEZ */}
              <div className="relative z-10 text-[#263029]">{children}</div>
            </div>

            {/* Firma */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-[#9A5B3C]/25" />

              <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#756D62]">
                Naturaleza · cultura · identidad
              </p>

              <span className="h-px w-8 bg-[#9A5B3C]/25" />
=======
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-gradient-to-br from-sky-950 via-slate-950 to-amber-950 p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

          <Link to="/" className="relative z-10 text-xl font-black tracking-tight">
            Turismo <span className="text-amber-300">La Paz</span>
          </Link>

          <div className="relative z-10 max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">
              Explora · descubre · conecta
            </p>
            <h1 className="text-5xl font-black leading-tight">
              Tu próxima experiencia comienza en La Paz.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Guarda tus preferencias, descubre atractivos y prepara tu recorrido
              desde una sola cuenta.
            </p>
          </div>

          <p className="relative z-10 text-sm text-slate-400">
            Proyecto académico · Ingeniería de Sistemas
          </p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="mb-10 inline-flex text-lg font-black tracking-tight lg:hidden"
            >
              Turismo <span className="ml-1 text-amber-300">La Paz</span>
            </Link>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
              <h2 className="text-3xl font-black tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
              <div className="mt-7">{children}</div>
>>>>>>> origin/main
            </div>
          </div>
        </section>
      </div>
    </main>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
