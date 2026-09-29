import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-center text-white">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">
          Error 404
        </p>
        <h1 className="mt-3 text-5xl font-black">Ruta no encontrada</h1>
        <p className="mt-4 text-slate-400">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
