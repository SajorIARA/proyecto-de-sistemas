/**
 * Accesos rápidos que montan sobre el borde inferior del hero.
 *
 * Tres entradas de uso frecuente con intenciones distintas: el catálogo,
 * el mapa de zonas y las rutas ya guardadas.
 */

import { Link } from "react-router-dom";
import { Icono, type NombreIcono } from "../../components/site/Iconos";

interface Acceso {
  titulo: string;
  descripcion: string;
  destino: string;
  icono: NombreIcono;
}

export function AccesosRapidos() {
  const accesos: Acceso[] = [
    {
      titulo: "Catálogo turístico",
      descripcion: "Busca por categoría, zona y precio en bolivianos.",
      destino: "/destinos",
      icono: "buscar",
    },
    {
      titulo: "La Paz por zonas",
      descripcion: "Del centro histórico al valle de Mallasa.",
      destino: "#zonas",
      icono: "mapa",
    },
    {
      titulo: "Mis rutas guardadas",
      descripcion: "Revisa tus recorridos y sigue armándolos.",
      destino: "/ruta",
      icono: "ruta",
    },
  ];

  return (
    <section
      aria-label="Accesos rápidos"
      className="relative z-20 bg-[var(--color-surface-muted)] pt-10 sm:pt-12"
    >
      <div className="contenedor-sitio">
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {accesos.map((acceso) => {
            const contenido = (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-route-strong)] text-[var(--color-text)] transition group-hover:bg-[var(--color-action)] group-hover:text-[var(--lp-night)]">
                  <Icono nombre={acceso.icono} className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-base font-black tracking-[-0.01em] text-[var(--color-text)]">
                    {acceso.titulo}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">
                    {acceso.descripcion}
                  </span>
                </span>

                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-brand)] transition group-hover:border-[var(--color-brand)] group-hover:bg-[var(--color-action)] group-hover:text-[var(--lp-night)]">
                  <Icono nombre="flecha" className="h-4 w-4" />
                </span>
              </>
            );

            const clases =
              "group flex h-full items-start gap-4 rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_18px_45px_rgba(72,55,38,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(72,55,38,0.18)]";

            return (
              <li key={acceso.titulo}>
                {acceso.destino.startsWith("#") ? (
                  <a href={acceso.destino} className={clases}>
                    {contenido}
                  </a>
                ) : (
                  <Link to={acceso.destino} className={clases}>
                    {contenido}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
