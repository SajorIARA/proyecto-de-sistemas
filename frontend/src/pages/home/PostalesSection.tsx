import { IMAGENES_SITIO } from "../../config/imagenesSitio";

const POSTALES = [
  { etiqueta: "Centro histórico", ...IMAGENES_SITIO.hero.cultura },
  { etiqueta: "Naturaleza de altura", ...IMAGENES_SITIO.hero.naturaleza },
  { etiqueta: "Miradores", ...IMAGENES_SITIO.categorias.Miradores },
  { etiqueta: "Atardecer paceño", ...IMAGENES_SITIO.cierre },
] as const;

export function PostalesSection() {
  return (
    <section className="bg-[var(--color-surface-muted)] py-14 sm:py-20">
      <div className="contenedor-sitio">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Postales para inspirarte
            </p>
            <h2 className="font-editorial mt-4 text-[clamp(2.4rem,4.8vw,4rem)] font-bold leading-none tracking-[-0.04em] text-[var(--color-text)]">
              La Paz cambia en cada mirada.
            </h2>
          </div>
          <p className="text-sm font-black text-[var(--color-brand)]">#TurismoLaPaz</p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {POSTALES.map((postal) => (
            <li key={postal.etiqueta} className="group relative h-44 overflow-hidden rounded-[1.4rem] sm:h-56">
              <img src={postal.src} alt={postal.alt} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <span className="absolute bottom-3 left-3 rounded-lg bg-[var(--color-surface)] px-2.5 py-1.5 text-[0.7rem] font-black text-[var(--color-brand)]">
                {postal.etiqueta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
