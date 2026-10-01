import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";

const categorias = [
  {
    icon: "🏔️",
    nombre: "Naturaleza",
    descripcion: "Paisajes que conectan la ciudad con los Andes.",
  },
  {
    icon: "🏛️",
    nombre: "Cultura",
    descripcion: "Historia, arquitectura, museos y tradición paceña.",
  },
  {
    icon: "🍲",
    nombre: "Gastronomía",
    descripcion: "Sabores auténticos, mercados y cocina local.",
  },
  {
    icon: "🌄",
    nombre: "Miradores",
    descripcion: "Descubre La Paz desde perspectivas inolvidables.",
  },
  {
    icon: "🥾",
    nombre: "Aventura",
    descripcion: "Experiencias únicas entre montañas y senderos.",
  },
  {
    icon: "🗿",
    nombre: "Arqueología",
    descripcion: "Conoce el legado ancestral del altiplano.",
  },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* HERO */}
      <section className="relative min-h-screen p-0">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-amber-300/35 blur-[120px]" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-300/30 blur-[130px]" />
        </div>

        <div className="relative w-full">
          <div
            className="relative min-h-screen w-full overflow-hidden bg-slate-950"
            style={{
              backgroundImage: `
                linear-gradient(
                  90deg,
                  rgba(4, 12, 20, 0.92) 0%,
                  rgba(4, 12, 20, 0.64) 42%,
                  rgba(4, 12, 20, 0.22) 72%,
                  rgba(4, 12, 20, 0.08) 100%
                ),
                url("https://images.unsplash.com/photo-1596395819057-e37f55a8516b?auto=format&fit=crop&w=2200&q=90")
              `,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* NAVBAR */}
            <header className="relative z-30 flex items-center justify-between px-6 py-6 sm:px-8 lg:px-12">
              <Link
                to="/"
                className="flex items-center gap-3 text-lg font-black tracking-tight"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
                  ⛰
                </span>

                <span>
                  Turismo{" "}
                  <span className="font-medium text-amber-300">La Paz</span>
                </span>
              </Link>

              <nav className="hidden items-center gap-8 text-sm font-medium text-white/75 lg:flex">
                <a href="#inicio" className="transition hover:text-white">
                  Inicio
                </a>
                <a href="#experiencias" className="transition hover:text-white">
                  Experiencias
                </a>
                <a href="#categorias" className="transition hover:text-white">
                  Categorías
                </a>
                <a href="#descubre" className="transition hover:text-white">
                  Descubre
                </a>
              </nav>

              <div className="flex items-center gap-3">
                {isAuthenticated ? (
                  <Link
                    to="/mi-cuenta"
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:scale-[1.03]"
                  >
                    Mi cuenta
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="hidden text-sm font-semibold text-white/80 transition hover:text-white sm:inline"
                    >
                      Iniciar sesión
                    </Link>

                    <Link
                      to="/registro"
                      className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.03] hover:bg-amber-100"
                    >
                      Registrarme
                    </Link>
                  </>
                )}
              </div>
            </header>

            {/* TEXTO GIGANTE */}
            <div
              id="inicio"
              className="pointer-events-none absolute left-1/2 top-24 z-0 -translate-x-1/2 select-none"
            >
              <span className="whitespace-nowrap text-[clamp(7rem,20vw,20rem)] font-black leading-none tracking-[-0.08em] text-white/[0.13]">
                LA PAZ
              </span>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="relative z-20 flex min-h-[650px] items-end px-6 pb-10 sm:px-8 sm:pb-14 lg:px-12 lg:pb-16">
              <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-end">
                <div className="max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-200 backdrop-blur-xl">
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    Bolivia desde las alturas
                  </div>

                  <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                    Explora La Paz
                    <span className="block text-white/80">
                      como nunca antes.
                    </span>
                  </h1>

                  <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                    Cultura, miradores, gastronomía y experiencias únicas en una
                    ciudad donde los Andes, la historia y la modernidad se
                    encuentran.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      to={isAuthenticated ? "/mi-cuenta" : "/registro"}
                      className="group inline-flex items-center gap-4 rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-950 transition hover:scale-[1.03] hover:bg-amber-100"
                    >
                      {isAuthenticated ? "Ir a mi cuenta" : "Comenzar ahora"}

                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white transition group-hover:rotate-45">
                        ↗
                      </span>
                    </Link>

                    <a
                      href="#experiencias"
                      className="rounded-full border border-white/15 bg-white/[0.05] px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
                    >
                      Ver experiencias
                    </a>
                  </div>
                </div>

                {/* MINI CARD */}
                <div className="w-full max-w-sm self-end rounded-[1.7rem] border border-white/15 bg-black/25 p-3 shadow-2xl backdrop-blur-xl">
                  <div
                    className="relative h-44 overflow-hidden rounded-[1.25rem] bg-cover bg-center"
                    style={{
                      backgroundImage:
                        'url("https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=900&q=85")',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    <div className="absolute bottom-4 left-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                        Destino destacado
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        La Paz desde las alturas
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2 pb-1 pt-4">
                    <div>
                      <p className="text-xs text-white/50">Explora</p>
                      <p className="text-sm font-bold text-white">
                        Miradores paceños
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white/60">
                        01 / 06
                      </span>

                      <div className="h-1 w-20 overflow-hidden rounded-full bg-white/20">
                        <div className="h-full w-1/3 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DEGRADADO INFERIOR */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        </div>
      </section>

      {/* EXPERIENCIAS / CATEGORÍAS */}
      <section
        id="experiencias"
        className="relative bg-[#ece8df] px-5 py-20 text-slate-950 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
                Vive La Paz
              </p>

              <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Una ciudad.
                <span className="block text-slate-500">
                  Seis formas de descubrirla.
                </span>
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-slate-600 sm:text-base">
              Explora experiencias seleccionadas para conocer la riqueza
              cultural, natural y gastronómica de La Paz.
            </p>
          </div>

          <div
            id="categorias"
            className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {categorias.map((categoria, index) => (
              <article
                key={categoria.nombre}
                className="group relative overflow-hidden rounded-[1.8rem] border border-slate-900/5 bg-white p-6 shadow-[0_15px_45px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-2xl">
                    {categoria.icon}
                  </span>

                  <span className="text-xs font-black text-slate-300">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="mt-10 text-2xl font-black tracking-tight">
                  {categoria.nombre}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  {categoria.descripcion}
                </p>

                <div className="mt-7 flex items-center gap-2 text-sm font-black">
                  Descubrir
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        id="descubre"
        className="bg-[#ece8df] px-5 pb-12 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-center text-white sm:px-10 lg:py-20">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
            Tu próxima experiencia empieza aquí
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            Descubre una nueva forma de conocer La Paz.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
            Organiza tus lugares favoritos y comienza a construir una
            experiencia turística hecha para ti.
          </p>

          <Link
            to={isAuthenticated ? "/mi-cuenta" : "/registro"}
            className="mt-8 inline-flex rounded-full bg-amber-300 px-7 py-3.5 text-sm font-black text-slate-950 transition hover:scale-[1.03] hover:bg-amber-200"
          >
            {isAuthenticated ? "Explorar mi cuenta" : "Crear mi experiencia"}
          </Link>
        </div>
      </section>
    </main>
  );
}