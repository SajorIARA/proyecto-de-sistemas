/**
 * Iconografía de línea del sitio público.
 *
 * Un único componente con un mapa de trazos evita repetir `<svg>` en
 * cada sección y mantiene el mismo grosor y remates en toda la
 * portada. Todos son decorativos: se renderizan con `aria-hidden`
 * porque el texto que los acompaña ya describe la acción.
 */

import type { ReactNode } from "react";

const TRAZOS = {
  montana: <path d="M3 19.5 9 6l4.2 8.4L15.5 11l5.5 8.5H3Z" />,
  brujula: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 5.1-5 2.1 2.1-5.1 5-2.1Z" />
    </>
  ),
  mapa: (
    <>
      <path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6l6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  ruta: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8 6h6a3.5 3.5 0 0 1 0 7h-4a3.5 3.5 0 0 0 0 7h6" />
    </>
  ),
  utensilios: (
    <>
      <path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11" />
      <path d="M16 3c-1.6 1.4-2.4 3.2-2.4 5.1 0 1.9.8 3.4 2.4 3.4s2.4-1.5 2.4-3.4C18.4 6.2 17.6 4.4 16 3Z" />
      <path d="M16 11.5V21" />
    </>
  ),
  camara: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  museo: (
    <>
      <path d="m3 9 9-5 9 5H3Z" />
      <path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" />
    </>
  ),
  hoja: (
    <>
      <path d="M5 19c0-8 5-13 14-14 1 9-4 14-12 14H5Z" />
      <path d="M5 19c2.5-3.5 5.5-6 9.5-7.5" />
    </>
  ),
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  altitud: (
    <>
      <path d="M3 19 9 6l4 8 2-3 6 8H3Z" />
      <path d="M18 3.5v5M15.5 6h5" />
    </>
  ),
  clima: (
    <>
      <circle cx="9" cy="9" r="3.4" />
      <path d="M9 2.5v1.7M9 13.8v1.7M2.5 9h1.7M13.8 9h1.7M4.4 4.4l1.2 1.2M12.4 12.4l1.2 1.2M13.6 4.4l-1.2 1.2M5.6 12.4l-1.2 1.2" />
      <path d="M17.5 20h-8a3 3 0 0 1 .2-6 4 4 0 0 1 7.7 1.1 2.6 2.6 0 0 1 .1 4.9Z" />
    </>
  ),
  transporte: (
    <>
      <rect x="4" y="4" width="16" height="12" rx="2.6" />
      <path d="M4 10h16M8 16v3M16 16v3" />
      <circle cx="8" cy="13" r="1" />
      <circle cx="16" cy="13" r="1" />
    </>
  ),
  moneda: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 8h4.2a2.1 2.1 0 0 1 0 4.2H10.6a2.1 2.1 0 0 0 0 4.2h4.2" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 3 5 6v6c0 4.2 3 7.5 7 9 4-1.5 7-4.8 7-9V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  estrella: (
    <path d="m12 3.5 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8L12 3.5Z" />
  ),
  usuario: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
} as const satisfies Record<string, ReactNode>;

export type NombreIcono = keyof typeof TRAZOS;

interface IconoProps {
  nombre: NombreIcono;
  className?: string;
}

export function Icono({ nombre, className = "h-5 w-5" }: IconoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
