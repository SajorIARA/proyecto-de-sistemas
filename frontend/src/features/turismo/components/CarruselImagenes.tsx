/**
 * Carrusel automático de imágenes con fundido cruzado.
 *
 * Recibe las URLs ya normalizadas (ver `imagenesDe`) y las alterna cada
 * `intervaloMs`. Es deliberadamente tonto respecto al origen: no sabe de
 * `Atractivo` ni de Cloudinary, así que sirve igual para la tarjeta del
 * catálogo y para la portada del detalle.
 *
 * Decisiones de UX y accesibilidad:
 * - **Se pausa** al pasar el ratón o al enfocar: la rotación no compite con
 *   la lectura ni con la navegación por teclado.
 * - **Respeta `prefers-reduced-motion`**: sin intervalos ni transición.
 * - Solo la imagen activa lleva `alt`; el resto van `aria-hidden` para que
 *   un lector de pantalla no anuncie N veces el mismo destino.
 * - Si una imagen falla se descarta sola; si fallan todas, se pinta el
 *   `fallback` (el marcador de marca de `DestinoImagen`), nunca un hueco.
 */

import { useEffect, useState, type ReactNode } from "react";

interface CarruselImagenesProps {
  /** URLs listas para usar. Vacío → se pinta `fallback`. */
  imagenes: string[];
  /** Texto alternativo de la imagen visible. */
  alt: string;
  /** Clases del contenedor; conviene `h-full w-full` para que llene su caja. */
  className?: string;
  /** Milisegundos entre cada cambio. */
  intervaloMs?: number;
  /** `true` en la primera imagen para cargarla con prioridad. */
  prioritaria?: boolean;
  sizes?: string;
  /** Se pinta cuando no queda ninguna imagen utilizable. */
  fallback?: ReactNode;
}

export function CarruselImagenes({
  imagenes,
  alt,
  className = "",
  intervaloMs = 4500,
  prioritaria = false,
  sizes,
  fallback = null,
}: CarruselImagenesProps) {
  const [fallidas, setFallidas] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [reducido, setReducido] = useState(false);

  const disponibles = imagenes.filter((url) => !fallidas.includes(url));
  const total = disponibles.length;
  const indiceActual = total > 0 ? Math.min(indice, total - 1) : 0;

  // Preferencia de movimiento reducido (jsdom no trae matchMedia: se ignora).
  useEffect(() => {
    try {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
      ) {
        return;
      }

      const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducido(consulta.matches);

      const alCambiar = () => setReducido(consulta.matches);
      consulta.addEventListener?.("change", alCambiar);

      return () => consulta.removeEventListener?.("change", alCambiar);
    } catch {
      // Sin matchMedia se asume movimiento normal.
    }
  }, []);

  // Si una imagen falla, el índice puede quedar fuera de rango.
  useEffect(() => {
    if (total > 0 && indice >= total) {
      setIndice(0);
    }
  }, [indice, total]);

  // Avance automático.
  useEffect(() => {
    if (total <= 1 || pausado || reducido) {
      return;
    }

    const id = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % total);
    }, intervaloMs);

    return () => window.clearInterval(id);
  }, [total, pausado, reducido, intervaloMs]);

  if (total === 0) {
    return <>{fallback}</>;
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-testid="carrusel-destino"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {disponibles.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={i === indiceActual ? alt : ""}
          aria-hidden={i === indiceActual ? undefined : true}
          loading={prioritaria && i === 0 ? "eager" : "lazy"}
          decoding="async"
          {...(sizes ? { sizes } : {})}
          onError={() =>
            setFallidas((previas) =>
              previas.includes(url) ? previas : [...previas, url],
            )
          }
          className={`absolute inset-0 h-full w-full object-cover ${
            reducido ? "" : "transition-opacity duration-1000 ease-out"
          } ${i === indiceActual ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {total > 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5"
          aria-hidden="true"
        >
          {disponibles.map((url, i) => (
            <span
              key={url}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === indiceActual ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
