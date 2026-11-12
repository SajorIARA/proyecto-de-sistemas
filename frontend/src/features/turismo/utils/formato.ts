/**
 * Formateo de datos de destino para presentación: moneda en BOB,
 * duración de visita, horarios y recorte de descripciones.
 */

import { NOMBRE_DIA } from "../../../config/turismo";
import type { Horario, Tarifa } from "../../../types/turismo";

/**
 * Formatea un monto en bolivianos.
 *
 * `Tarifa.monto` llega como string porque DRF serializa los Decimal con
 * `COERCE_DECIMAL_TO_STRING`, pero se tolera number por si el backend
 * cambia la serialización.
 */
export function formatearMonto(
  monto: string | number | null | undefined,
  moneda = "BOB",
): string {
  const valor = Number(monto);

  if (monto === null || monto === undefined || Number.isNaN(valor)) {
    return "Sin información";
  }

  if (valor === 0) {
    return "Gratuito";
  }

  const decimales = Number.isInteger(valor) ? 0 : 2;

  return `${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  }).format(valor)} ${moneda}`;
}

/** "90" → "1 h 30 min" · "45" → "45 min" · null → "Sin información". */
export function formatearDuracion(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || minutos <= 0) {
    return "Sin información";
  }

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (resto === 0) {
    return `${horas} h`;
  }

  return `${horas} h ${resto} min`;
}

/** "09:00:00" | "09:00" → "09:00" · null → null. */
export function formatearHora(hora: string | null | undefined): string | null {
  if (!hora) {
    return null;
  }

  const partes = hora.split(":");

  if (partes.length < 2) {
    return hora;
  }

  return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}`;
}

/** Rango de atención de un horario, listo para mostrar. */
export function formatearHorario(horario: Horario): string {
  if (horario.cerrado) {
    return "Cerrado";
  }

  const apertura = formatearHora(horario.hora_apertura);
  const cierre = formatearHora(horario.hora_cierre);

  if (!apertura && !cierre) {
    return "Horario no informado";
  }

  if (apertura && cierre) {
    return `${apertura} – ${cierre}`;
  }

  return apertura ?? cierre ?? "Horario no informado";
}

export interface HorarioPorDia extends Horario {
  etiquetaDia: string;
  rango: string;
  cerrado: boolean;
}

/**
 * Normaliza los horarios de un destino a los 7 días de la semana, en
 * orden. El backend puede devolver días incompletos o de más (respeta
 * `ck_horario_dia`: 1..7); los que falten se rellenan como "no informado"
 * para que la tabla nunca quede con huecos.
 */
export function horariosPorDia(horarios: Horario[]): HorarioPorDia[] {
  const porDia = new Map<number, Horario>();

  for (const horario of horarios) {
    porDia.set(horario.dia_semana, horario);
  }

  return Array.from({ length: 7 }, (_, indice) => {
    const dia = indice + 1;
    const registrado = porDia.get(dia);

    const horario: Horario = registrado ?? {
      id_horario: -dia,
      atractivo: null,
      dia_semana: dia,
      hora_apertura: null,
      hora_cierre: null,
      cerrado: false,
      vigente_desde: null,
      vigente_hasta: null,
    };

    return {
      ...horario,
      etiquetaDia: NOMBRE_DIA(dia),
      rango: formatearHorario(horario),
    };
  });
}

/** Ordena las tarifas de más barata a más cara. */
export function ordenarTarifas(tarifas: Tarifa[]): Tarifa[] {
  return [...tarifas].sort((a, b) => Number(a.monto) - Number(b.monto));
}

/** Tarifa más barata, usada como "tarifa base" del destino. */
export function tarifaBase(tarifas: Tarifa[]): Tarifa | null {
  return ordenarTarifas(tarifas)[0] ?? null;
}

/** Número de días a la semana que el destino abre. */
export function diasAbiertos(horarios: Horario[]): number {
  return horarios.filter((horario) => !horario.cerrado).length;
}

/**
 * Recorta la descripción para la card. `descripcion` puede venir larga
 * (el seed trae textos de una línea, pero el backend centraliza aquí la
 * descripción histórica completa).
 */
export function recortar(texto: string, maximo = 140): string {
  const limpio = texto.trim();

  if (limpio.length <= maximo) {
    return limpio;
  }

  const corte = limpio.slice(0, maximo);
  const ultimoEspacio = corte.lastIndexOf(" ");

  return `${(ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte).trimEnd()}…`;
}

/** Coordenadas legibles para el detalle. */
export function formatearCoordenadas(
  ubicacion: { longitud: number; latitud: number } | null,
): string {
  if (!ubicacion) {
    return "Coordenadas no registradas";
  }

  const { latitud, longitud } = ubicacion;

  return `${latitud.toFixed(5)}, ${longitud.toFixed(5)}`;
}
