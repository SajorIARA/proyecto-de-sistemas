import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";

export function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <Link to="/" className="text-xl font-black">
            Turismo <span className="text-amber-300">La Paz</span>
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5"
          >
            Cerrar sesión
          </button>
        </header>

        <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.05] p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
            Sesión activa
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Hola{user?.nombre ? `, ${user.nombre}` : ""}.
          </h1>
          <p className="mt-3 text-slate-400">
            {user?.email || "Tu cuenta está conectada correctamente."}
          </p>

          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-100">
            El flujo frontend de registro, login, persistencia de sesión y logout
            está listo para conectarse con Django.
          </div>
        </section>
      </div>
    </main>
  );
}
