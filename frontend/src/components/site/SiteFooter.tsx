import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="chuki-footer" aria-labelledby="site-footer-title">
      <div className="chuki-footer__main">
        <div className="chuki-footer__brand">
          <p className="chuki-brand" id="site-footer-title">
            ✺ CHUKIYAPU
            <small>ATLAS VIVO DE LOS ANDES</small>
          </p>
          <p>
            Información para descubrir, organizar y recorrer La Paz según tus
            intereses y tu tiempo.
          </p>
        </div>

        <nav aria-label="Explorar desde el pie">
          <h2>Explorar</h2>
          <Link to="/destinos">Destinos</Link>
          <Link to="/#experiencias">Experiencias</Link>
          <Link to="/#zonas">Zonas</Link>
          <Link to="/ruta">Mi viaje</Link>
        </nav>

        <nav aria-label="Cuenta desde el pie">
          <h2>Cuenta</h2>
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/registro">Crear cuenta</Link>
          <Link to="/mi-cuenta/preferencias">Mis preferencias</Link>
        </nav>

        <div className="chuki-footer__info">
          <h2>Información</h2>
          <a href="https://lapaz.bo/turismo/" target="_blank" rel="noreferrer">
            Turismo oficial de La Paz ↗
          </a>
          <a href="/images/CREDITOS.md">Créditos fotográficos</a>
          <p>La Paz · Bolivia</p>
        </div>
      </div>
      <div className="chuki-footer__bottom">
        <span>© 2026 CHUKIYAPU · Proyecto de Sistemas</span>
        <span>Fotografías reales con autoría y licencia documentadas.</span>
      </div>
    </footer>
  );
}
