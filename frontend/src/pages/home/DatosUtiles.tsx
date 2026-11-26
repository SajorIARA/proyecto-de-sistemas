/**
 * Datos útiles para planificar la visita.
 *
 * Información referencial y estable (no depende de la API): altitud,
 * clima, transporte y moneda. Aporta el bloque de "información general"
 * que la referencia municipal también resuelve en la portada.
 */

import { Icono, type NombreIcono } from "../../components/site/Iconos";

interface DatoUtil {
  titulo: string;
  valor: string;
  detalle: string;
  icono: NombreIcono;
}

const DATOS: readonly DatoUtil[] = [
  {
    titulo: "Altitud",
    valor: "3.600 – 4.100 m",
    detalle: "Llega con tiempo y sube despacio los primeros días.",
    icono: "altitud",
  },
  {
    titulo: "Clima",
    valor: "Frío y seco",
    detalle: "Días soleados y noches frescas durante todo el año.",
    icono: "clima",
  },
  {
    titulo: "Transporte",
    valor: "Teleférico y minibús",
    detalle: "El teleférico conecta la hoyada con El Alto en minutos.",
    icono: "transporte",
  },
  {
    titulo: "Moneda",
    valor: "Boliviano (Bs)",
    detalle: "Lleva efectivo para mercados, fondas y transporte.",
    icono: "moneda",
  },
];

export function DatosUtiles() {
  return (
    <section id="datos" className="scroll-mt-24 bg-[var(--color-surface)] py-14 sm:py-20">
      <div className="contenedor-sitio">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Información general
            </p>

            <h2 className="font-display mt-5 text-[clamp(2.4rem,5vw,4.2rem)] font-black leading-[0.98] tracking-[-0.045em] text-[var(--color-text)]">
              Lo que conviene saber{" "}
              <span className="font-editorial font-normal italic text-[var(--color-brand)]">
                antes de llegar
              </span>
              .
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">
            Cuatro datos que conviene tener a mano. Son referenciales y no
            reemplazan las recomendaciones oficiales de cada atractivo.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DATOS.map((dato) => (
            <li
              key={dato.titulo}
              className="flex h-full flex-col rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-route-strong)] text-[var(--color-text)]">
                <Icono nombre={dato.icono} className="h-5 w-5" />
              </span>

              <h3 className="mt-6 text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                {dato.titulo}
              </h3>

              <p className="font-display mt-2 text-xl font-black tracking-[-0.02em] text-[var(--color-text)]">
                {dato.valor}
              </p>

              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                {dato.detalle}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
