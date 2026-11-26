/**
 * Contrato del panel de importación desde fuentes abiertas.
 *
 * Espeja los serializers de `backend/conocimiento/serializers.py`. Los datos
 * que la fuente no declaró llegan vacíos o `null`; el frontend no los inventa.
 */

import type { FuenteAbierta } from "../config/conocimiento";

export type EstadoImportacion = "pendiente" | "completado" | "error";
export type EstadoVectorizacion =
  | "sin_vectorizar"
  | "pendiente"
  | "completado"
  | "error";
export type EstadoCandidato = "pendiente" | "aprobado" | "rechazado";

export interface ImportacionLugares {
  id_importacion: string;
  consulta: string;
  ciudad: string;
  fuentes: string[];
  estado: EstadoImportacion;
  error: string;
  encontrados: number;
  candidatos_creados: number;
  duplicados: number;
  estado_vectorizacion: EstadoVectorizacion;
  error_vectorizacion: string;
  vectorizado_en: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface LugarCandidato {
  id_candidato: string;
  importacion: string;
  fuente: FuenteAbierta | string;
  id_externo: string;
  hash_contenido: string;
  nombre: string;
  descripcion: string;
  categoria_sugerida: string;
  categoria: string;
  latitud: number | null;
  longitud: number | null;
  direccion: string;
  horario_declarado: string;
  sitio_web: string;
  url_fuente: string;
  licencia: string;
  duracion_minutos: number | null;
  estado: EstadoCandidato;
  atractivo: string | null;
  notas_revision: string;
  fecha_creacion: string;
}

export interface CrearImportacionInput {
  consulta: string;
  ciudad: string;
  fuentes: FuenteAbierta[];
  limite: number;
}

export interface ResultadoAprobacion {
  id_atractivo: string;
  id_fuente: string;
  fragmentos: number;
  actualizado: boolean;
  vectorizacion_encolada: boolean;
  estado_vectorizacion: EstadoVectorizacion;
}

export interface ResultadoVectorizacion {
  id_importacion: string;
  estado: EstadoVectorizacion;
  fuentes: number;
  mensaje: string;
}
