import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FOTO_ACCESO } from "../../../config/imagenesSitio";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="chuki-auth">
      <div className="chuki-auth__layout">
        <section className="chuki-auth__visual">
          <img
            src={FOTO_ACCESO.src}
            alt={FOTO_ACCESO.alt}
            width="1200"
            height="1600"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="chuki-auth__veil" />
          <div className="chuki-auth__visual-content">
            <Link to="/" className="chuki-brand">
              ✺ CHUKIYAPU
              <small>ATLAS VIVO DE LOS ANDES</small>
            </Link>
            <div className="chuki-auth__manifesto">
              <p>Tu recorrido continúa</p>
              <h1>
                La ciudad que descubres también puede recordarte.
              </h1>
              <p>
                Conserva tus preferencias, vuelve a tus recomendaciones y
                continúa planificando sin perder el hilo del viaje.
              </p>
            </div>
            <p className="chuki-auth__altitude">La Paz · 3.600 m s. n. m.</p>
          </div>
        </section>

        <section className="chuki-auth__form-side">
          <div className="chuki-auth__form-wrap">
            <Link
              to="/"
              className="chuki-brand chuki-auth__mobile-brand"
            >
              ✺ CHUKIYAPU
              <small>ATLAS VIVO DE LOS ANDES</small>
            </Link>

            <p className="chuki-auth__eyebrow">Cuenta de viajero</p>
            <h2 className="chuki-auth__title">
              {title}
            </h2>
            <p className="chuki-auth__subtitle">
              {subtitle}
            </p>
            <div className="chuki-auth__card">
              {children}
            </div>
            <p className="chuki-auth__privacy">
              Tus datos de acceso se utilizan únicamente para gestionar tu cuenta.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
