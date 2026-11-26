import { Link } from "react-router-dom";
import { Icono } from "../../components/site/Iconos";

const PASOS = [
  ["01", "Elige lo que te inspira", "Cultura, naturaleza, sabores o aventura."],
  ["02", "Explora con claridad", "Compara destinos, zonas, tiempos y tarifas."],
  ["03", "Diseña tu experiencia", "Recibe recomendaciones según tu viaje."],
] as const;

export function PlanificaSection() {
  return (
    <section className="overflow-hidden bg-[var(--color-surface-muted)] py-14 sm:py-20">
      <div className="contenedor-sitio grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
            Diseña tu día
          </p>
          <h2 className="font-editorial mt-5 text-[clamp(2.7rem,5vw,4.5rem)] font-bold leading-[0.96] tracking-[-0.045em] text-[var(--color-text)]">
            Tu viaje no tiene una sola ruta.
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-7 text-[var(--color-brand)] sm:text-base">
            Combina lugares, sabores y momentos según tu tiempo. La guía te
            ayuda a descubrir La Paz sin prisa y sin perderte lo esencial.
          </p>
          <Link
            to="/ruta"
            className="mt-8 inline-flex min-h-11 items-center gap-3 rounded-full bg-[var(--color-route-strong)] px-6 py-3.5 text-sm font-black text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          >
            Ver mis rutas
            <Icono nombre="flecha" className="h-4 w-4" />
          </Link>
        </div>

        <ol className="space-y-3">
          {PASOS.map(([numero, titulo, texto]) => (
            <li
              key={numero}
              className="group flex gap-5 rounded-[1.4rem] bg-[var(--color-surface)] p-5 shadow-[0_12px_28px_rgba(24,56,45,0.08)] transition hover:translate-x-2"
            >
              <span className="font-editorial flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)] text-lg font-bold text-[var(--lp-night)]">
                {numero}
              </span>
              <div>
                <h3 className="text-base font-black text-[var(--color-text)]">{titulo}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
