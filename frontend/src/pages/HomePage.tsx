import { Link } from "react-router-dom";
import { Icono, type NombreIcono } from "../components/site/Iconos";
import { SiteFooter } from "../components/site/SiteFooter";
import { SiteHeader } from "../components/site/SiteHeader";
import { useClimaActual } from "../features/clima/hooks/useClimaActual";

const DESTINOS = [
  {
    nombre: "Valle de la Luna",
    categoria: "Naturaleza",
    zona: "Mallasa",
    imagen: "/images/chukiyapu-d0.jpg",
    alt: "Formaciones de arcilla erosionadas del Valle de la Luna, cerca de La Paz",
  },
  {
    nombre: "Plaza Murillo",
    categoria: "Historia",
    zona: "Centro",
    imagen: "/images/chukiyapu-d1.jpg",
    alt: "Plaza Murillo y el Palacio de Gobierno en el centro de La Paz",
  },
  {
    nombre: "Chacaltaya",
    categoria: "Aventura",
    zona: "Cordillera Real",
    imagen: "/images/chukiyapu-d2.jpg",
    alt: "La montaña de Chacaltaya nevada, cerca de La Paz",
  },
  {
    nombre: "Lago Titicaca",
    categoria: "Naturaleza",
    zona: "Copacabana",
    imagen: "/images/chukiyapu-d3.jpg",
    alt: "Copacabana a orillas del lago Titicaca, Bolivia",
  },
] as const;

const EXPERIENCIAS: readonly {
  nombre: string;
  categoria: string;
  descripcion: string;
  icono: NombreIcono;
  imagen: string;
  alt: string;
}[] = [
  {
    nombre: "Naturaleza de altura",
    categoria: "Naturaleza",
    descripcion: "Valles, montañas y paisajes que cambian con la altura.",
    icono: "hoja",
    imagen: "/images/cat-naturaleza.jpg",
    alt: "Formaciones de arcilla del Valle de la Luna",
  },
  {
    nombre: "Cultura viva",
    categoria: "Cultura",
    descripcion: "Museos, memoria, patrimonio y tradiciones paceñas.",
    icono: "museo",
    imagen: "/images/cat-cultura.jpg",
    alt: "Fachada de la Basílica de San Francisco en La Paz",
  },
  {
    nombre: "Sabores locales",
    categoria: "Gastronomía",
    descripcion: "Mercados, cocina de altura y mesas con identidad.",
    icono: "utensilios",
    imagen: "/images/cat-gastronomia.jpg",
    alt: "Salteña boliviana recién horneada",
  },
  {
    nombre: "Miradores",
    categoria: "Miradores",
    descripcion: "Balcones naturales para entender la forma de la ciudad.",
    icono: "camara",
    imagen: "/images/cat-miradores.jpg",
    alt: "Vista de la hoyada de La Paz desde el mirador Killi Killi",
  },
] as const;

const ZONAS = [
  {
    nombre: "Centro",
    detalle: "Historia y vida cívica",
    imagen: "/images/chukiyapu-d1.jpg",
    alt: "Plaza Murillo en el centro de La Paz",
  },
  {
    nombre: "San Francisco",
    detalle: "Basílica y mercados",
    imagen: "/images/hero-cultura.jpg",
    alt: "Plaza y Basílica de San Francisco en La Paz",
  },
  {
    nombre: "Sopocachi",
    detalle: "Cafés y vida cultural",
    imagen: "/images/cierre-atardecer.jpg",
    alt: "Vista urbana de La Paz iluminada al atardecer",
  },
  {
    nombre: "Miraflores",
    detalle: "Parques y vistas urbanas",
    imagen: "/images/cat-miradores.jpg",
    alt: "Panorama de la hoyada y las laderas de La Paz",
  },
  {
    nombre: "Mallasa",
    detalle: "Naturaleza y clima templado",
    imagen: "/images/hero-naturaleza.jpg",
    alt: "Formaciones naturales del Valle de la Luna en Mallasa",
  },
  {
    nombre: "Zona Sur",
    detalle: "La ciudad al pie del Illimani",
    imagen: "/images/catalogo-illimani.jpg",
    alt: "Panorama de La Paz con el Illimani al fondo",
  },
] as const;

const PLANES = [
  {
    nombre: "Tengo 2 horas",
    detalle: "Una parada esencial",
    tiempo: "2-horas",
    imagen: "/images/hero-cultura.jpg",
    alt: "Basílica de San Francisco en el centro histórico de La Paz",
  },
  {
    nombre: "Tengo medio día",
    detalle: "Combina dos o tres lugares",
    tiempo: "medio-dia",
    imagen: "/images/hero-gastronomia.jpg",
    alt: "Plato paceño tradicional con productos andinos",
  },
  {
    nombre: "Tengo un día",
    detalle: "Diseña un recorrido completo",
    tiempo: "dia",
    imagen: "/images/hero-aventura.jpg",
    alt: "Huayna Potosí nevado al atardecer",
  },
] as const;

export function HomePage() {
  const clima = useClimaActual();
  const resumenClima = clima.isLoading
    ? "Actualizando clima…"
    : clima.data
      ? `${clima.data.temperaturaC} °C`
      : "Clima no disponible";
  const condicionClima = clima.data
    ? clima.data.condicion
    : clima.isLoading
      ? "Consultando condiciones actuales"
      : "Inténtalo nuevamente más tarde";

  return (
    <div className="chuki-home">
      <SiteHeader />

      <main id="contenido-principal">
        <section className="chuki-hero" aria-labelledby="chuki-hero-title">
          <div>
            <span className="chuki-eyebrow">LA PAZ · BOLIVIA</span>
            <h1 id="chuki-hero-title">
              Descubre <span>La Paz</span>
              <br />a tu manera.
            </h1>
            <p>
              Cultura viva, paisajes de altura y aventuras que te cambian la
              perspectiva.
            </p>
            <Link className="chuki-btn" to="/destinos">
              Explorar destinos →
            </Link>{" "}
            <Link className="chuki-btn chuki-secondary" to="/destinos?vista=armar">
              Planificar mi viaje
            </Link>
          </div>

          <aside className="chuki-clima" aria-live="polite" aria-label="Clima actual en La Paz">
            <span className="chuki-clima__icono" aria-hidden="true">
              <Icono nombre="clima" className="h-6 w-6" />
            </span>
            <span className="chuki-clima__contenido">
              <small>LA PAZ, BOLIVIA · AHORA</small>
              <strong>{resumenClima}</strong>
              <span>{condicionClima}</span>
            </span>
          </aside>
        </section>

        <section className="chuki-main" aria-labelledby="chuki-destinos-title">
          <h2 id="chuki-destinos-title">Destinos imperdibles</h2>

          <div className="chuki-grid">
            {DESTINOS.map((destino, indice) => (
              <article
                className="chuki-tile"
                data-cat={destino.categoria}
                key={destino.nombre}
                style={{ animationDelay: `${indice * 80}ms` }}
              >
                <img
                  src={destino.imagen}
                  alt={destino.alt}
                  width="900"
                  height="560"
                />
                <div className="chuki-pad">
                  <span className="chuki-tag">
                    {destino.categoria} · {destino.zona}
                  </span>
                  <h3>{destino.nombre}</h3>
                  <p>Descubre una perspectiva diferente de La Paz.</p>
                  <Link
                    className="chuki-btn chuki-secondary"
                    to={`/destinos?categoria=${encodeURIComponent(destino.categoria)}`}
                  >
                    Explorar ↗
                  </Link>{" "}
                  <Link
                    className="chuki-add"
                    to="/destinos?vista=armar"
                    title={`Agregar ${destino.nombre} a la ruta`}
                  >
                    +
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <section
            className="chuki-section"
            id="experiencias"
            aria-labelledby="chuki-experiencias-title"
          >
            <div className="chuki-section__intro">
              <div>
                <span className="chuki-eyebrow">DESCUBRE LA PAZ</span>
                <h2 id="chuki-experiencias-title">
                  ¿Qué puedes vivir hoy en La Paz?
                </h2>
              </div>
              <p>
                Empieza por lo que te interesa. Cada opción abre el catálogo
                con la categoría elegida.
              </p>
            </div>

            <div className="chuki-experience-grid">
              {EXPERIENCIAS.map((experiencia) => (
                <Link
                  className="chuki-experience"
                  key={experiencia.categoria}
                  to={`/destinos?categoria=${encodeURIComponent(experiencia.categoria)}`}
                >
                  <img
                    src={experiencia.imagen}
                    alt={experiencia.alt}
                    width="640"
                    height="420"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="chuki-experience__shade" aria-hidden="true" />
                  <span className="chuki-experience__icon" aria-hidden="true">
                    <Icono nombre={experiencia.icono} className="h-6 w-6" />
                  </span>
                  <span className="chuki-experience__copy">
                    <h3>{experiencia.nombre}</h3>
                    <small>{experiencia.descripcion}</small>
                  </span>
                  <span className="chuki-experience__arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </section>

          <section
            className="chuki-section chuki-zones"
            id="zonas"
            aria-labelledby="chuki-zonas-title"
          >
            <div className="chuki-section__intro">
              <div>
                <span className="chuki-eyebrow">LA CIUDAD POR ZONAS</span>
                <h2 id="chuki-zonas-title">Elige desde dónde explorar</h2>
              </div>
              <p>
                Recorre sectores reconocidos por el catálogo y encuentra
                atractivos en el área que te interesa.
              </p>
            </div>

            <div className="chuki-zone-grid">
              {ZONAS.map((zona) => (
                <Link
                  className="chuki-zone"
                  key={zona.nombre}
                  to={`/destinos?zona=${encodeURIComponent(zona.nombre)}`}
                >
                  <img
                    src={zona.imagen}
                    alt={zona.alt}
                    width="480"
                    height="300"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="chuki-zone__shade" aria-hidden="true" />
                  <span className="chuki-zone__copy">
                    <Icono nombre="ubicacion" className="h-5 w-5" />
                    <span>
                      <strong>{zona.nombre}</strong>
                      <small>{zona.detalle}</small>
                    </span>
                  </span>
                  <span className="chuki-zone__arrow" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section
            className="chuki-section chuki-planning"
            aria-labelledby="chuki-planning-title"
          >
            <div className="chuki-section__intro">
              <div>
                <span className="chuki-eyebrow">PLANEA SEGÚN TU TIEMPO</span>
                <h2 id="chuki-planning-title">Haz que el día te alcance</h2>
              </div>
              <p>
                Indica cuánto tiempo tienes y empieza el planificador con esa
                condición ya seleccionada.
              </p>
            </div>

            <div className="chuki-plan-grid">
              {PLANES.map((plan) => (
                <Link
                  className="chuki-plan"
                  key={plan.tiempo}
                  to={`/destinos?vista=armar&tiempo=${plan.tiempo}`}
                >
                  <img
                    src={plan.imagen}
                    alt={plan.alt}
                    width="640"
                    height="420"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="chuki-plan__shade" aria-hidden="true" />
                  <span className="chuki-plan__content">
                    <Icono nombre="reloj" className="h-7 w-7" />
                    <strong>{plan.nombre}</strong>
                    <small>{plan.detalle}</small>
                    <span aria-hidden="true">Comenzar →</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
