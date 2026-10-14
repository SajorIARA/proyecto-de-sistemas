/**
 * Estado global de las preferencias del turista (parte del estado de la SPA).
 *
 * Es la única fuente de verdad del borrador del formulario mientras el
 * turista lo completa. Cualquier pantalla puede leerlo con `usePreferencias`,
 * de modo que el formulario y el resto de la aplicación no se desincronizan.
 *
 * El borrador se persiste temporalmente en `localStorage` (con un pequeño
 * debounce) para sobrevivir a una recarga. `hayBorrador` distingue "hay
 * cambios sin guardar" de "el formulario está limpio", y `guardadoEn` da la
 * pista visual de "guardado localmente".
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PREFERENCIAS_STORAGE_DEBOUNCE_MS } from "../../../config/preferencias";
import { useDebouncedValue } from "../../../lib/useDebouncedValue";
import type { PreferenciasFormValues } from "../../../types/preferencias";
import {
  borrarBorradorLocal,
  escribirBorradorLocal,
  leerBorradorLocal,
} from "../utils/preferenciasStorage";
import { borradorInicial } from "../utils/validaciones";

interface PreferenciasContextValue {
  /** Estado actual del formulario. */
  borrador: PreferenciasFormValues;
  /** `true` si hay cambios sin guardar respaldados localmente. */
  hayBorrador: boolean;
  /** Timestamp de la última escritura local, o `null` si no hay borrador. */
  guardadoEn: number | null;
  /** Aplica un cambio parcial (chips, slider, inputs…). */
  actualizar: (cambios: Partial<PreferenciasFormValues>) => void;
  /** Reemplaza el borrador completo (por ejemplo, al precargar el perfil). */
  reemplazar: (valores: PreferenciasFormValues) => void;
  /** Vacía el formulario y borra el respaldo local. */
  descartar: () => void;
  /** Marca el borrador como guardado: elimina el respaldo, conserva valores. */
  marcarGuardado: () => void;
}

const PreferenciasContext = createContext<PreferenciasContextValue | null>(
  null,
);

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [borrador, setBorrador] = useState<PreferenciasFormValues>(
    () => leerBorradorLocal() ?? borradorInicial(),
  );
  const [hayBorrador, setHayBorrador] = useState<boolean>(
    () => leerBorradorLocal() !== null,
  );
  const [guardadoEn, setGuardadoEn] = useState<number | null>(null);

  const borradorDiferido = useDebouncedValue(
    borrador,
    PREFERENCIAS_STORAGE_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (!hayBorrador) {
      return;
    }

    escribirBorradorLocal(borradorDiferido);
    setGuardadoEn(Date.now());
  }, [borradorDiferido, hayBorrador]);

  const actualizar = useCallback(
    (cambios: Partial<PreferenciasFormValues>) => {
      setHayBorrador(true);
      setBorrador((anterior) => ({ ...anterior, ...cambios }));
    },
    [],
  );

  const reemplazar = useCallback((valores: PreferenciasFormValues) => {
    setHayBorrador(true);
    setBorrador(valores);
  }, []);

  const descartar = useCallback(() => {
    borrarBorradorLocal();
    setBorrador(borradorInicial());
    setHayBorrador(false);
    setGuardadoEn(null);
  }, []);

  const marcarGuardado = useCallback(() => {
    borrarBorradorLocal();
    setHayBorrador(false);
    setGuardadoEn(null);
  }, []);

  const value = useMemo(
    () => ({
      borrador,
      hayBorrador,
      guardadoEn,
      actualizar,
      reemplazar,
      descartar,
      marcarGuardado,
    }),
    [borrador, hayBorrador, guardadoEn, actualizar, reemplazar, descartar, marcarGuardado],
  );

  return (
    <PreferenciasContext.Provider value={value}>
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias(): PreferenciasContextValue {
  const contexto = useContext(PreferenciasContext);

  if (!contexto) {
    throw new Error(
      "usePreferencias debe utilizarse dentro de PreferenciasProvider.",
    );
  }

  return contexto;
}
