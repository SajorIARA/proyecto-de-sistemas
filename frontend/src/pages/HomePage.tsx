/**
 * Portada del sitio.
 *
 * La composición sigue el ritmo de una guía impresa: cabecera
 * fotográfica con datos de edición, franja de accesos, índice de
 * categorías, friso tipográfico, itinerario de zonas, carta
 * gastronómica, ficha del viajero y postal de cierre. Alterna fondos
 * oscuros y claros para que cada sección respire distinto.
 *
 * No hay video: el hero rota fotografías. Tampoco se consulta la API en
 * la portada; el catálogo real se abre a un clic y así se evita gastar
 * cuota del `AnonRateThrottle` con cada visita al inicio.
 */

import { SiteFooter } from "../components/site/SiteFooter";
import { SiteHeader } from "../components/site/SiteHeader";
import { AccesosRapidos } from "./home/AccesosRapidos";
import { CtaFinal } from "./home/CtaFinal";
import { DatosUtiles } from "./home/DatosUtiles";
import { DescubreCategorias } from "./home/DescubreCategorias";
import { FrisoCiudad } from "./home/FrisoCiudad";
import { GastronomiaBanner } from "./home/GastronomiaBanner";
import { HeroPrincipal } from "./home/HeroPrincipal";
import { ZonasSection } from "./home/ZonasSection";

export function HomePage() {
  return (
    <div className="bg-[#F3EBDD]">
      <a
        href="#descubre"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#FFFDF8] focus:px-5 focus:py-3 focus:text-sm focus:font-black focus:text-[#233128] focus:shadow-xl"
      >
        Saltar al contenido
      </a>

      <SiteHeader />

      <main>
        <HeroPrincipal />
        <AccesosRapidos />
        <DescubreCategorias />
        <FrisoCiudad />
        <ZonasSection />
        <GastronomiaBanner />
        <DatosUtiles />
        <CtaFinal />
      </main>

      <SiteFooter />
    </div>
  );
}
