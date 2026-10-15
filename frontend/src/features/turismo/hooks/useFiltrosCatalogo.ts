/**
 * Estado del panel de filtros del catálogo, respaldado por la **URL**.
 *
 * La URL es la única fuente de verdad de los filtros (`?categoria=&q=&zona=`
 * `&precio_min=&precio_max=`), lo que los hace compartibles, recargables y
 * navegables con atrás/adelante. El único matiz es el texto: se guarda en un
 * borrador local y solo se vuelca a la URL tras el debounce, para no disparar
 * una petición por pulsación ni ensuciar el historial.
 *
 * Los nombres de los parámetros coinciden con los del backend a propósito, así
 * que un enlace se puede pegar directo contra la API si hiciera falta.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BUSQUEDA_DEBOUNCE_MS,
  esCategoriaOficial,
} from "../../../config/turismo";
import { useDebouncedValue } from "../../../lib/useDebouncedValue";
import type { FiltrosCatalogo } from "../../../types/turismo";

/** Convierte un query param numérico, tolerando coma decimal. */
function aNumero(valor: string | null): number | null {
  if (valor === null || valor.trim() === "") {
    return null;
  }

  const numero = Number(valor.replace(",", "."));

  return Number.isFinite(numero) ? numero : null;
}

/** Texto recortado; `null` o espacios se convierten en cadena vacía. */
function aTexto(valor: string | null): string {
  return valor?.trim() ?? "";
}

export interface UseFiltrosCatalogoResultado {
  filtros: FiltrosCatalogo;
  /** Número de filtros activos (para el resumen y el estado vacío). */
  activos: number;
  /** Borrador del buscador (lo que el usuario está escribiendo). */
  borrador: string;
  setBorrador: (valor: string) => void;
  setCategoria: (categoria: string | null) => void;
  setZona: (zona: string | null) => void;
  setRangoPrecio: (min: number | null, max: number | null) => void;
  /** Quita el filtro de texto sin tocar el resto. */
  limpiarTexto: () => void;
  /** Deja el catálogo sin ningún filtro. */
  limpiar: () => void;
}

export function useFiltrosCatalogo(): UseFiltrosCatalogoResultado {
  const [parametros, setParametros] = useSearchParams();

  const categoriaParam = parametros.get("categoria");
  const categoria = esCategoriaOficial(categoriaParam) ? categoriaParam : null;
  const q = aTexto(parametros.get("q"));
  const zona = aTexto(parametros.get("zona")) || null;
  const precioMin = aNumero(parametros.get("precio_min"));
  const precioMax = aNumero(parametros.get("precio_max"));

  // Borrador local del texto: solo se escribe en la URL tras el debounce.
  const [borrador, setBorrador] = useState(q);
  const borradorDiferido = useDebouncedValue(borrador, BUSQUEDA_DEBOUNCE_MS);

  const setParametro = useCallback(
    (cambios: Record<string, string | null>) => {
      setParametros(
        (previos) => {
          const siguiente = new URLSearchParams(previos);

          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor === null || valor === "") {
              siguiente.delete(clave);
            } else {
              siguiente.set(clave, valor);
            }
          }

          return siguiente;
        },
        // replace evita apilar una entrada de historial por cada cambio.
        { replace: true },
      );
    },
    [setParametros],
  );

  /*
   * Vuelca a la URL el texto ya "asentado" (tras el debounce). El ref evita
   * reescribir `q` cuando la URL cambió por fuera (atrás/adelante o "quitar
   * filtro") mientras había un debounce pendiente: en ese caso `borradorDiferido`
   * no ha cambiado y no debemos reintroducir el texto viejo.
   */
  const textoPrevio = useRef(borradorDiferido);

  useEffect(() => {
    if (textoPrevio.current === borradorDiferido) {
      return;
    }

    textoPrevio.current = borradorDiferido;
    const texto = borradorDiferido.trim();

    setParametros(
      (previos) => {
        if ((previos.get("q") ?? "") === texto) {
          return previos;
        }

        const siguiente = new URLSearchParams(previos);

        if (texto) {
          siguiente.set("q", texto);
        } else {
          siguiente.delete("q");
        }

        return siguiente;
      },
      { replace: true },
    );
  }, [borradorDiferido, setParametros]);

  // Si la URL cambia por fuera, refresca el borrador del input.
  useEffect(() => {
    setBorrador((actual) => (actual.trim() === q ? actual : q));
  }, [q]);

  const filtros = useMemo<FiltrosCatalogo>(
    () => ({ categoria, q, zona, precioMin, precioMax }),
    [categoria, q, zona, precioMin, precioMax],
  );

  const activos = useMemo(() => {
    let total = 0;

    if (categoria) total += 1;
    if (q) total += 1;
    if (zona) total += 1;
    if (precioMin !== null || precioMax !== null) total += 1;

    return total;
  }, [categoria, q, zona, precioMin, precioMax]);

  const limpiarTexto = useCallback(() => {
    setBorrador("");
    setParametro({ q: null });
  }, [setParametro]);

  const setRangoPrecio = useCallback(
    (min: number | null, max: number | null) => {
      setParametro({
        precio_min: min === null ? null : String(min),
        precio_max: max === null ? null : String(max),
      });
    },
    [setParametro],
  );

  const limpiar = useCallback(() => {
    setBorrador("");
    setParametros(new URLSearchParams(), { replace: true });
  }, [setParametros]);

  return {
    filtros,
    activos,
    borrador,
    setBorrador,
    setCategoria: (nueva) => setParametro({ categoria: nueva }),
    setZona: (nueva) => setParametro({ zona: nueva }),
    setRangoPrecio,
    limpiarTexto,
    limpiar,
  };
}
