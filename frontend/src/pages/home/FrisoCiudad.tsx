/**
 * Friso tipográfico entre secciones.
 *
 * Una cinta de lugares y sabores que se desplaza lentamente, como las
 * bandas de una revista de viajes. Es decorativa: se oculta a los
 * lectores de pantalla y se detiene con `prefers-reduced-motion`.
 */

const PARADAS = [
  "Salteñas de media mañana",
  "Teleférico sobre la hoyada",
  "Valle de la Luna",
  "Plaza San Francisco",
  "Mirador Killi Killi",
  "Mercado Rodríguez",
  "Illimani al fondo",
] as const;

export function FrisoCiudad() {
  return (
    <section
      aria-hidden="true"
      className="overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-action)] py-3.5 text-[var(--color-canvas)]"
    >
      <div className="friso-ciudad flex w-max">
        {[0, 1].map((copia) => (
          <ul key={copia} className="flex shrink-0 items-center">
            {PARADAS.map((parada) => (
              <li
                key={`${copia}-${parada}`}
                className="flex items-center gap-6 whitespace-nowrap px-6 font-mono text-[10px] font-bold uppercase tracking-[0.24em]"
              >
                <span>{parada}</span>
                <span className="h-1 w-1 shrink-0 rotate-45 bg-[var(--color-route-strong)]" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
