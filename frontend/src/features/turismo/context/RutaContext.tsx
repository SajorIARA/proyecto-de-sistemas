/**
 * Viajes del turista: borrador local + persistencia en `/api/viajes/`.
 *
 * Antes este contexto solo guardaba arreglos en memoria y «guardar» marcaba
 * una bandera. Ahora, con sesión, hidrata desde el backend al entrar y Guar-
 * dar/Renombrar/Reordenar/Iniciar/Marcar visitada se reflejan en la API. Sin
 * sesión se conserva el borrador de la visita para no perder la selección.
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
import type { Atractivo } from "../../../types/turismo";
import { useAuth } from "../../auth/context/AuthContext";
import { listarAtractivos } from "../api/turismoApi";
import {
  actualizarViaje,
  crearViaje,
  eliminarViaje,
  finalizarViaje,
  iniciarViaje,
  listarViajes,
  marcarVisitada,
  type EstadoViaje,
  type ParadaViaje,
  type ViajeBackend,
} from "../api/viajesApi";

interface RutaContextValue {
  destinos: Atractivo[];
  rutas: Ruta[];
  rutaActivaId: string;
  contiene: (id: Atractivo["id"]) => boolean;
  alternar: (atractivo: Atractivo) => void;
  quitar: (id: Atractivo["id"]) => void;
  crearRuta: () => void;
  seleccionarRuta: (id: string) => void;
  renombrarRuta: (nombre: string) => void;
  /** `true` si quedó persistida (o como borrador local sin sesión). */
  guardarRuta: () => Promise<boolean>;
  eliminarRuta: (id: string) => Promise<void>;
  iniciarViaje: () => Promise<void>;
  finalizarViaje: () => Promise<void>;
  marcarVisitada: (paradaId: number, visitada: boolean) => Promise<void>;
  guardando: boolean;
  errorRuta: string | null;
}

export interface Ruta {
  id: string;
  nombre: string;
  destinos: Atractivo[];
  /** `true` cuando existe en el backend (o se guardó como borrador local). */
  guardada: boolean;
  estado: EstadoViaje;
  /** Paradas del backend; permite marcar visitas por id. */
  paradasBackend: ParadaViaje[];
}

const RutaContext = createContext<RutaContextValue | null>(null);

function rutaLocalVacia(nombre: string, id: string): Ruta {
  return {
    id,
    nombre,
    destinos: [],
    guardada: false,
    estado: "planificado",
    paradasBackend: [],
  };
}

function destinoDesdeParada(parada: ParadaViaje): Atractivo {
  return {
    id: parada.atractivo,
    nombre: parada.nombre || "Destino sin nombre",
    descripcion: "",
    direccion: null,
    duracion_minutos: null,
    ubicacion: null,
    area: null,
    categorias: [],
    fuente_origen: "INSTITUCIONAL",
    activo: true,
    fecha_creacion: "",
    fecha_actualizacion: "",
  };
}

function desdeBackend(
  viaje: ViajeBackend,
  catalogo: Map<string, Atractivo>,
): Ruta {
  const paradas = [...viaje.paradas].sort((a, b) => a.orden - b.orden);
  return {
    id: viaje.id,
    nombre: viaje.nombre,
    destinos: paradas.map(
      (parada) => catalogo.get(parada.atractivo) ?? destinoDesdeParada(parada),
    ),
    guardada: true,
    estado: viaje.estado,
    paradasBackend: paradas,
  };
}

export function RutaProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [rutas, setRutas] = useState<Ruta[]>([rutaLocalVacia("Mi ruta", "ruta-1")]);
  const [rutaActivaId, setRutaActivaId] = useState("ruta-1");
  const [guardando, setGuardando] = useState(false);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const rutaActiva = rutas.find((ruta) => ruta.id === rutaActivaId) ?? rutas[0];

  // Hidratación una sola vez por sesión. Si falla, el borrador sigue intacto.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelado = false;

    void (async () => {
      try {
        const [viajes, catalogo] = await Promise.all([
          listarViajes(),
          listarAtractivos({ pageSize: 100 }).catch(() => null),
        ]);
        if (cancelado || viajes.length === 0) return;

        const porId = new Map<string, Atractivo>(
          (catalogo?.results ?? []).map((destino) => [destino.id, destino]),
        );
        const persistidas = viajes.map((viaje) => desdeBackend(viaje, porId));
        setRutas((actuales) => [
          ...persistidas,
          ...actuales.filter((ruta) => !ruta.guardada),
        ]);
        setRutaActivaId(persistidas[0].id);
      } catch {
        // Sin backend no se pierde el trabajo local; el error se muestra
        // al intentar guardar.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [isAuthenticated]);

  const sincronizarParadas = useCallback((ruta: Ruta) => {
    if (!ruta.guardada || ruta.id.startsWith("ruta-")) return;
    void actualizarViaje(ruta.id, {
      paradas: ruta.destinos.map((destino) => destino.id),
    }).catch(() => setErrorRuta("No pudimos sincronizar los cambios del viaje."));
  }, []);

  const value = useMemo<RutaContextValue>(() => ({
    destinos: rutaActiva.destinos,
    rutas,
    rutaActivaId: rutaActiva.id,
    contiene: (id) => rutaActiva.destinos.some((destino) => destino.id === id),
    alternar: (atractivo) => {
      setRutas((actuales) => actuales.map((ruta) => {
        if (ruta.id !== rutaActiva.id) return ruta;
        const yaIncluido = ruta.destinos.some((destino) => destino.id === atractivo.id);
        const actualizada: Ruta = {
          ...ruta,
          destinos: yaIncluido
            ? ruta.destinos.filter((destino) => destino.id !== atractivo.id)
            : [...ruta.destinos, atractivo],
        };
        sincronizarParadas(actualizada);
        return actualizada;
      }));
    },
    quitar: (id) => {
      setRutas((actuales) => actuales.map((ruta) => {
        if (ruta.id !== rutaActiva.id) return ruta;
        const actualizada: Ruta = {
          ...ruta,
          destinos: ruta.destinos.filter((destino) => destino.id !== id),
        };
        sincronizarParadas(actualizada);
        return actualizada;
      }));
    },
    crearRuta: () => {
      const numero = rutas.length + 1;
      const nuevaRuta = rutaLocalVacia(`Ruta ${numero}`, `ruta-${numero}`);
      setRutas((actuales) => [...actuales, nuevaRuta]);
      setRutaActivaId(nuevaRuta.id);
      setErrorRuta(null);
    },
    seleccionarRuta: (id) => {
      setRutaActivaId(id);
      setErrorRuta(null);
    },
    renombrarRuta: (nombre) => {
      setRutas((actuales) => actuales.map((ruta) => {
        if (ruta.id !== rutaActiva.id) return ruta;
        if (ruta.guardada && !ruta.id.startsWith("ruta-")) {
          void actualizarViaje(ruta.id, { nombre }).catch(() =>
            setErrorRuta("No pudimos guardar el nuevo nombre.")
          );
        }
        return { ...ruta, nombre };
      }));
    },
    guardarRuta: async () => {
      const actual = rutas.find((ruta) => ruta.id === rutaActiva.id) ?? rutas[0];
      if (!actual) return false;
      setErrorRuta(null);

      // Sin sesión queda un borrador local; el planner ya redirige al login.
      if (!isAuthenticated) {
        setRutas((actuales) => actuales.map((ruta) => (
          ruta.id === actual.id ? { ...ruta, guardada: true } : ruta
        )));
        return true;
      }
      if (actual.guardada && !actual.id.startsWith("ruta-")) return true;
      if (actual.destinos.length === 0) return false;

      setGuardando(true);
      try {
        const porId = new Map(actual.destinos.map((d) => [d.id, d]));
        const viaje = await crearViaje({
          nombre: actual.nombre,
          paradas: actual.destinos.map((destino) => destino.id),
        });
        const guardada = desdeBackend(viaje, porId);
        setRutas((actuales) => [
          guardada,
          ...actuales.filter((ruta) => ruta.id !== actual.id),
        ]);
        setRutaActivaId(guardada.id);
        return true;
      } catch {
        setErrorRuta("No pudimos guardar el viaje. Revisá tu conexión e intentá de nuevo.");
        return false;
      } finally {
        setGuardando(false);
      }
    },
    eliminarRuta: async (id) => {
      setRutas((actuales) => {
        const restantes = actuales.filter((ruta) => ruta.id !== id);
        return restantes.length > 0 ? restantes : [rutaLocalVacia("Mi ruta", "ruta-1")];
      });
      if (!id.startsWith("ruta-")) {
        try {
          await eliminarViaje(id);
        } catch {
          setErrorRuta("No pudimos eliminar el viaje guardado.");
        }
      }
      if (rutaActivaId === id) setRutaActivaId("ruta-1");
    },
    iniciarViaje: async () => {
      if (!rutaActiva.guardada || rutaActiva.id.startsWith("ruta-")) return;
      try {
        const viaje = await iniciarViaje(rutaActiva.id);
        setRutas((actuales) => actuales.map((ruta) => (
          ruta.id === viaje.id ? desdeBackend(viaje, new Map(ruta.destinos.map((d) => [d.id, d]))) : ruta
        )));
      } catch {
        setErrorRuta("No pudimos iniciar el seguimiento del viaje.");
      }
    },
    finalizarViaje: async () => {
      if (!rutaActiva.guardada || rutaActiva.id.startsWith("ruta-")) return;
      try {
        const viaje = await finalizarViaje(rutaActiva.id);
        setRutas((actuales) => actuales.map((ruta) => (
          ruta.id === viaje.id ? desdeBackend(viaje, new Map(ruta.destinos.map((d) => [d.id, d]))) : ruta
        )));
      } catch {
        setErrorRuta("No pudimos finalizar el seguimiento del viaje.");
      }
    },
    marcarVisitada: async (paradaId, visitada) => {
      if (!rutaActiva.guardada || rutaActiva.id.startsWith("ruta-")) return;
      try {
        const viaje = await marcarVisitada(rutaActiva.id, paradaId, visitada);
        setRutas((actuales) => actuales.map((ruta) => (
          ruta.id === viaje.id ? desdeBackend(viaje, new Map(ruta.destinos.map((d) => [d.id, d]))) : ruta
        )));
      } catch {
        setErrorRuta("No pudimos registrar la visita.");
      }
    },
    guardando,
    errorRuta,
  }), [rutaActiva, rutas, rutaActivaId, guardando, errorRuta, isAuthenticated, sincronizarParadas]);

  return <RutaContext.Provider value={value}>{children}</RutaContext.Provider>;
}

export function useRuta() {
  const contexto = useContext(RutaContext);
  if (!contexto) {
    throw new Error("useRuta debe usarse dentro de RutaProvider.");
  }
  return contexto;
}

/** Para shells compartidos que también se prueban o renderizan de forma aislada. */
export function useRutaOpcional() {
  return useContext(RutaContext);
}
