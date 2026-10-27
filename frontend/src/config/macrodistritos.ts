/**
 * Macrodistritos de La Paz con sus coordenadas centroidales de referencia.
 * Usados como fallback cuando el usuario no activa el GPS.
 */

export interface Macrodistrito {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

export const MACRODISTRITOS_LA_PAZ: readonly Macrodistrito[] = [
  { id: "centro", nombre: "Centro", latitud: -16.495, longitud: -68.134 },
  { id: "sopocachi", nombre: "Sopocachi", latitud: -16.507, longitud: -68.131 },
  { id: "sur", nombre: "Sur", latitud: -16.54, longitud: -68.09 },
  { id: "miraflores", nombre: "Miraflores", latitud: -16.5, longitud: -68.125 },
  { id: "mallasa", nombre: "Mallasa", latitud: -16.56, longitud: -68.09 },
] as const;

export type MacrodistritoNombre = (typeof MACRODISTRITOS_LA_PAZ)[number]["nombre"];
