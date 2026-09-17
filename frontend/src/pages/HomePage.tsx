import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="text-xl font-black tracking-tight">
          Turismo <span className="text-amber-300">La Paz</span>
        </Link>

        <nav className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/mi-cuenta"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950"
            >
              Mi cuenta
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-bold text-slate-300 hover:text-white sm:inline"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/registro"
                className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-200"
              >
                Registrarme
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-2">
        <div className="absolute left-1/3 top-1/3 -z-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.26em] text-sky-300">
            Descubre Bolivia desde las alturas
          </p>

          <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            La Paz,
            <span className="block text-amber-300">más cerca de ti.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
            Explora atractivos, organiza tus favoritos y construye una experiencia
            turística personalizada.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to={isAuthenticated ? "/mi-cuenta" : "/registro"}
              className="rounded-full bg-sky-400 px-7 py-3.5 text-sm font-black text-slate-950 hover:bg-sky-300"
            >
              {isAuthenticated ? "Ir a mi cuenta" : "Comenzar ahora"}
            </Link>
            <a
              href="#experiencias"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/5"
            >
              Ver experiencias
            </a>
          </div>
        </div>

        <div
          id="experiencias"
          className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
        >
          {[
            ["🏔️", "Naturaleza", "Paisajes y rutas inolvidables"],
            ["🏛️", "Cultura", "Historia, museos y patrimonio"],
            ["🍲", "Gastronomía", "Sabores paceños para descubrir"],
            ["🚡", "Ciudad", "Recorre La Paz desde otra perspectiva"],
          ].map(([icon, title, text]) => (
            <article
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur"
            >
              <span className="text-3xl" aria-hidden="true">
                {icon}
              </span>
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
