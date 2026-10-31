/**
 * Portada del sitio.
 *
 * Composición inspirada en las portadas turísticas municipales
 * (hero fotográfico, accesos rápidos, categorías, zonas, gastronomía e
 * información general) pero con la identidad andina del proyecto:
 * verde profundo, terracota, ocre y crema.
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
        <ZonasSection />
        <GastronomiaBanner />
        <DatosUtiles />
        <CtaFinal />
      </main>

      <SiteFooter />
    </div>
  );
}
