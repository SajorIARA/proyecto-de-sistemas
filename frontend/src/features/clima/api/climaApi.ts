/**
 * Cliente público para el tiempo actual en La Paz. Open-Meteo no requiere
 * credenciales y permite consultar desde el navegador mediante CORS.
 */

export interface ClimaActual {
  temperaturaC: number;
  condicion: string;
}

interface RespuestaOpenMeteo {
  current?: {
    temperature_2m?: unknown;
    weather_code?: unknown;
  };
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const LA_PAZ = {
  latitude: -16.4897,
  longitude: -68.1193,
} as const;

const CONDICIONES_POR_CODIGO: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  66: "Lluvia helada ligera",
  67: "Lluvia helada intensa",
  71: "Nevada ligera",
  73: "Nevada moderada",
  75: "Nevada intensa",
  77: "Granizo",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos intensos",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve intensos",
  95: "Tormenta",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo intenso",
};

export function condicionDesdeCodigoMeteorologico(codigo: number): string {
  return CONDICIONES_POR_CODIGO[codigo] ?? "Condiciones variables";
}

function esNumeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

export async function obtenerClimaActual(
  signal?: AbortSignal,
): Promise<ClimaActual> {
  const parametros = new URLSearchParams({
    latitude: String(LA_PAZ.latitude),
    longitude: String(LA_PAZ.longitude),
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });
  const respuesta = await fetch(`${OPEN_METEO_URL}?${parametros}`, { signal });

  if (!respuesta.ok) {
    throw new Error("El servicio meteorológico no está disponible.");
  }

  const datos = (await respuesta.json()) as RespuestaOpenMeteo;
  const temperatura = datos.current?.temperature_2m;
  const codigo = datos.current?.weather_code;

  if (!esNumeroFinito(temperatura) || !esNumeroFinito(codigo)) {
    throw new Error("El servicio meteorológico devolvió datos incompletos.");
  }

  return {
    temperaturaC: Math.round(temperatura),
    condicion: condicionDesdeCodigoMeteorologico(codigo),
  };
}
