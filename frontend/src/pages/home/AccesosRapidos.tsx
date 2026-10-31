/**
 * Accesos rápidos que montan sobre el borde inferior del hero.
 *
 * Tres entradas de uso frecuente: el catálogo, el mapa de zonas y la
 * planificación de la visita. La tercera cambia de destino según haya
 * sesión activa.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { Icono, type NombreIcono } from "../../components/site/Iconos";

interface Acceso {
  titulo: string;
  descripcion: string;
  destino: string;
  icono: NombreIcono;
}

export function AccesosRapidos() {
  const { isAuthenticated } = useAuth();

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
      titulo: "Planifica tu visita",
      descripcion: "Guarda tus favoritos y arma tu propia ruta.",
      destino: isAuthenticated ? "/mi-cuenta" : "/registro",
      icono: "ruta",
    },
  ];

  return (
    <section
      aria-label="Accesos rápidos"
      className="relative z-20 bg-[#F3EBDD] pt-10 sm:pt-12"
    >
      <div className="contenedor-sitio">
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {accesos.map((acceso) => {
            const contenido = (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2F4B3B] text-[#F3EBDD] transition group-hover:bg-[#9A5B3C]">
                  <Icono nombre={acceso.icono} className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-base font-black tracking-[-0.01em] text-[#233128]">
                    {acceso.titulo}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#746D63]">
                    {acceso.descripcion}
                  </span>
                </span>

                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#5B3A29]/15 text-[#9A5B3C] transition group-hover:border-[#9A5B3C] group-hover:bg-[#9A5B3C] group-hover:text-[#FFFDF8]">
                  <Icono nombre="flecha" className="h-4 w-4" />
                </span>
              </>
            );

            const clases =
              "group flex h-full items-start gap-4 rounded-[1.4rem] border border-[#5B3A29]/10 bg-[#FFFDF8] p-5 shadow-[0_18px_45px_rgba(72,55,38,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(72,55,38,0.18)]";

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
