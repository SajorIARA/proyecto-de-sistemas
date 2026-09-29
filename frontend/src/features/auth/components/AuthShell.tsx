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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
