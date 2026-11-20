/**
 * Accesos rápidos que cierran el hero.
 *
 * En lugar de tarjetas flotantes, una franja de tres entradas separadas
 * por líneas finas, como el índice de una guía. La tercera cambia de
 * destino según haya sesión activa.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { Icono, type NombreIcono } from "../../components/site/Iconos";

interface Acceso {
  titulo: string;
  descripcion: string;
  accion: string;
  destino: string;
  icono: NombreIcono;
}

export function AccesosRapidos() {
  const { isAuthenticated } = useAuth();

  const accesos: Acceso[] = [
    {
      titulo: "Catálogo turístico",
      descripcion: "Filtra por categoría, zona y precio en bolivianos.",
      accion: "Abrir catálogo",
      destino: "/destinos",
      icono: "buscar",
    },
    {
      titulo: "La Paz por zonas",
      descripcion: "Del casco histórico al valle de Mallasa.",
      accion: "Ver zonas",
      destino: "#zonas",
      icono: "mapa",
    },
    {
      titulo: "Planifica tu visita",
      descripcion: "Guarda favoritos y arma tu propia ruta.",
      accion: "Armar mi ruta",
      destino: isAuthenticated ? "/mi-cuenta" : "/registro",
      icono: "ruta",
    },
  ];

  return (
    <section aria-label="Accesos rápidos" className="bg-[#F3EBDD]">
      <div className="contenedor-sitio">
        <ul className="grid divide-y divide-[#5B3A29]/15 border-y border-[#5B3A29]/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {accesos.map((acceso, indice) => {
            const relleno =
              indice === 0
                ? "sm:pl-0"
                : indice === accesos.length - 1
                  ? "sm:pr-0"
                  : "";

            const contenido = (
              <>
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9A5B3C]">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <Icono
                    nombre={acceso.icono}
                    className="h-5 w-5 text-[#2F4B3B]"
                  />
                </span>

                <span className="block">
                  <span className="font-display block text-xl font-black tracking-[-0.02em] text-[#233128]">
                    {acceso.titulo}
                  </span>
                  <span className="mt-2 block max-w-[26ch] text-sm leading-6 text-[#746D63]">
                    {acceso.descripcion}
                  </span>
                </span>

                <span className="mt-auto inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F4B3B]">
                  {acceso.accion}
                  <span className="transition-transform group-hover:translate-x-1">
                    <Icono nombre="flecha" className="h-4 w-4" />
                  </span>
                </span>
              </>
            );

            const clases = [
              "group flex h-full flex-col gap-4 py-5 transition-colors hover:bg-[#FFFDF8]/70 sm:gap-8 sm:px-8 sm:py-7",
              relleno,
            ].join(" ");

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
