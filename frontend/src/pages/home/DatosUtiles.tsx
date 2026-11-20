/**
 * Datos útiles para planificar la visita.
 *
 * La información estable (altitud, clima, transporte y moneda) se
 * presenta como la ficha de un cuaderno de viaje: una tabla de líneas
 * finas y un sello circular, sin tarjetas ni iconos enmarcados.
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
    <section id="datos" className="scroll-mt-24 bg-[#FFFDF8] py-20 sm:py-28">
      <div className="contenedor-sitio">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <header className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#9A5B3C]">
              Información general
            </p>

            <h2 className="font-display mt-5 text-[clamp(2.4rem,4vw,3.4rem)] font-black leading-[0.96] tracking-[-0.045em] text-[#233128]">
              La letra pequeña del viaje.
            </h2>

            <p className="mt-5 max-w-sm text-sm leading-7 text-[#5C574E]">
              Lo que conviene saber antes de subir: altitud, clima, transporte
              y moneda. Son datos referenciales, no reemplazan las
              recomendaciones de cada atractivo.
            </p>

            <div
              aria-hidden="true"
              className="mt-8 flex h-28 w-28 -rotate-6 items-center justify-center rounded-full border border-dashed border-[#9A5B3C]/45 text-center"
            >
              <span className="font-mono text-[9px] uppercase leading-5 tracking-[0.22em] text-[#9A5B3C]">
                La Paz
                <br />
                3.640 m
                <br />
                Bolivia
              </span>
            </div>
          </header>

          <div className="lg:col-span-8">
            <dl className="grid border-l border-t border-[#5B3A29]/15 sm:grid-cols-2">
              {DATOS.map((dato) => (
                <div
                  key={dato.titulo}
                  className="border-b border-r border-[#5B3A29]/15 p-6 sm:p-8"
                >
                  <dt className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A5B3C]">
                    <span>{dato.titulo}</span>
                    <Icono
                      nombre={dato.icono}
                      className="h-4 w-4 text-[#2F4B3B]"
                    />
                  </dt>

                  <dd className="font-display mt-4 text-2xl font-black tracking-[-0.03em] text-[#233128] sm:text-[1.7rem]">
                    {dato.valor}
                  </dd>

                  <dd className="mt-2 text-sm leading-6 text-[#746D63]">
                    {dato.detalle}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[#746D63]">
              Datos referenciales · Verifica horarios y tarifas en cada destino
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
