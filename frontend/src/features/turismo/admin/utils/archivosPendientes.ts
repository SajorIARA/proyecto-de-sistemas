/**
 * Archivos elegidos en el alta de un destino, antes de que exista su UUID.
 *
 * El backend referencia cada foto por el `id_atractivo`, así que durante el
 * alta todavía no se puede firmar ni persistir la subida. Estos "pendientes"
 * viven solo en memoria: se eligen y previsualizan en `GaleriaNueva` y
 * `AdminDestinoFormPage` los sube apenas el `POST` devuelve el id.
 */

import type { TipoFoto } from "../../../../types/turismo";
import { tipoDeArchivo } from "../api/fotosAdminApi";

export interface ArchivoPendiente {
  /** Identificador local estable para las listas de React y las bajas. */
  id: string;
  archivo: File;
  tipo: TipoFoto;
  /**
   * `blob:` URL para la miniatura de las imágenes. `null` si no se pudo
   * crear (videos, o entornos sin `URL.createObjectURL` como jsdom).
   */
  previewUrl: string | null;
}

let contador = 0;

/**
 * Crea la `blob:` URL de la miniatura sin romper en entornos que no la
 * implementan (jsdom no la trae y lanzaría).
 */
function crearPreviewUrl(archivo: File, tipo: TipoFoto): string | null {
  if (tipo !== "imagen") {
    return null;
  }

  try {
    if (typeof URL.createObjectURL !== "function") {
      return null;
    }

    return URL.createObjectURL(archivo);
  } catch {
    return null;
  }
}

/** Envuelve un `File` validado en un pendiente con id local y miniatura. */
export function crearPendiente(archivo: File): ArchivoPendiente {
  const tipo = tipoDeArchivo(archivo) ?? "imagen";

  return {
    id: `pendiente-${Date.now()}-${contador++}`,
    archivo,
    tipo,
    previewUrl: crearPreviewUrl(archivo, tipo),
  };
}

/** Libera la `blob:` URL asociada, si la hay. */
export function liberarPendiente(pendiente: ArchivoPendiente): void {
  if (!pendiente.previewUrl) {
    return;
  }

  try {
    URL.revokeObjectURL?.(pendiente.previewUrl);
  } catch {
    // La miniatura ya no es crítica: si revocar falla, no se rompe nada.
  }
}
