/**
 * Formulario de alta y edición de destinos.
 *
 * Cubre dos rutas con el mismo componente, porque el backend también usa el
 * mismo serializer para las dos operaciones:
 *
 * - `/mi-cuenta/destinos/nuevo`            → `POST`
 * - `/mi-cuenta/destinos/:id/editar`        → `PATCH`
 *
 * Solo ADMIN. Igual que en el panel de destinos, la barrera se repite en tres
 * capas (`RoleRoute`, `enabled: esAdmin` y el 403 del backend) para que un
 * fallo del frontend nunca exponga datos ni permita escribir.
 *
 * Fotos: el backend referencia cada archivo por el UUID del atractivo, así que
 * no se puede firmar ni persistir una subida hasta que el destino existe. Por
 * eso:
 *
 * - **En el alta** se eligen y previsualizan los archivos en `GaleriaNueva`
 *   (sin red); apenas el `POST` devuelve el id, esta página los sube uno a
 *   uno mostrando el progreso y navega a la edición.
 * - **En la edición** ya hay id, así que la galería clásica (`GaleriaAdmin`)
 *   sube contra la API normalmente.
 *
 * Al editar, tras guardar vuelve al listado con `replace: true`, así el botón
 * "atrás" del navegador no lleva al formulario de un destino que ya no existe
 * en pantalla. Al crear, va a la **edición del destino recién creado**
 * (también con `replace`).
 */

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PrivateShell } from "../../../cuenta/components/PrivateShell";
import { DestinoForm } from "../components/DestinoForm";
import { GaleriaAdmin } from "../components/GaleriaAdmin";
import { GaleriaNueva } from "../components/GaleriaNueva";
import { subirFotoDestino } from "../api/fotosAdminApi";
import { useCategorias } from "../../hooks/useTurismo";
import { useDestinoAdmin } from "../hooks/useDestinosAdmin";
import { VALORES_INICIALES, valoresDesdeDestino } from "../utils/destinoForm";
import {
  liberarPendiente,
  type ArchivoPendiente,
} from "../utils/archivosPendientes";
import type { AtractivoAdmin } from "../../../../types/turismo";

/** Fila de progreso de una subida durante el alta. */
interface ItemSubida {
  id: string;
  nombre: string;
  porcentaje: number;
  estado: "pendiente" | "ok" | "error";
}

export function AdminDestinoFormPage() {
  const { id } = useParams<{ id: string }>();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const {
    data: destino,
    isPending,
    isError,
    error,
  } = useDestinoAdmin(id ?? "");

  const { data: categorias, isPending: cargandoCategorias } = useCategorias();

  /**
   * Archivos elegidos en el alta. Viven acá (y no en `GaleriaNueva`) para que
   * la página pueda subirlos cuando el `POST` devuelva el `id_atractivo`.
   */
  const [archivosPendientes, setArchivosPendientes] = useState<
    ArchivoPendiente[]
  >([]);
  const [subiendo, setSubiendo] = useState(false);
  const [estadoSubidas, setEstadoSubidas] = useState<ItemSubida[]>([]);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [destinoCreadoId, setDestinoCreadoId] = useState<string | null>(null);

  // Espejo para liberar las `blob:` URLs al desmontar sin re-suscribir el efecto.
  const pendientesRef = useRef<ArchivoPendiente[]>([]);

  useEffect(() => {
    pendientesRef.current = archivosPendientes;
  }, [archivosPendientes]);

  useEffect(
    () => () => {
      pendientesRef.current.forEach(liberarPendiente);
    },
    [],
  );

  function agregarPendientes(nuevos: ArchivoPendiente[]) {
    setArchivosPendientes((previos) => [...previos, ...nuevos]);
  }

  function quitarPendiente(idPendiente: string) {
    setArchivosPendientes((previos) => {
      const objetivo = previos.find((item) => item.id === idPendiente);

      if (objetivo) {
        liberarPendiente(objetivo);
      }

      return previos.filter((item) => item.id !== idPendiente);
    });
  }

  function actualizarItem(idItem: string, cambios: Partial<ItemSubida>) {
    setEstadoSubidas((previas) =>
      previas.map((item) =>
        item.id === idItem ? { ...item, ...cambios } : item,
      ),
    );
  }

  function navegarAEdicion(idAtractivo: string) {
    navigate(`/mi-cuenta/destinos/${idAtractivo}/editar`, { replace: true });
  }

  /** Sube la lista al destino ya creado. `true` si todos subieron. */
  async function subirPendientes(
    idAtractivo: string,
    lista: ArchivoPendiente[],
  ): Promise<boolean> {
    setSubiendo(true);
    setErrorSubida(null);

    // Añade solo las filas que falten (al reintentar se conservan las que ya están).
    setEstadoSubidas((previas) => {
      const porId = new Map(previas.map((item) => [item.id, item] as const));

      for (const pendiente of lista) {
        if (!porId.has(pendiente.id)) {
          porId.set(pendiente.id, {
            id: pendiente.id,
            nombre: pendiente.archivo.name,
            porcentaje: 0,
            estado: "pendiente",
          });
        }
      }

      return Array.from(porId.values());
    });

    for (let indice = 0; indice < lista.length; indice += 1) {
      const pendiente = lista[indice];
      // En un reintento `lista` solo trae los fallidos: usar `indice` les
      // reasignaría el orden desde 0 y podría duplicar el de una foto ya
      // subida. Se conserva la posición original dentro de la galería.
      const posicion = archivosPendientes.findIndex(
        (item) => item.id === pendiente.id,
      );
      const orden = posicion >= 0 ? posicion : indice;

      actualizarItem(pendiente.id, { estado: "pendiente", porcentaje: 0 });

      try {
        await subirFotoDestino(
          { atractivo: idAtractivo, archivo: pendiente.archivo, orden },
          (porcentaje) => actualizarItem(pendiente.id, { porcentaje }),
        );
        actualizarItem(pendiente.id, { estado: "ok", porcentaje: 100 });
      } catch (fallo) {
        actualizarItem(pendiente.id, { estado: "error" });
        setErrorSubida(
          fallo instanceof Error
            ? fallo.message
            : "No pudimos subir uno de los archivos.",
        );
        setSubiendo(false);
        return false;
      }
    }

    setSubiendo(false);
    return true;
  }

  async function alGuardar(destinoGuardado: AtractivoAdmin) {
    const destinoId = destinoGuardado.id_atractivo;
    setDestinoCreadoId(destinoId);

    if (editando) {
      navigate("/mi-cuenta/destinos", { replace: true });
      return;
    }

    if (archivosPendientes.length === 0) {
      navegarAEdicion(destinoId);
      return;
    }

    const exito = await subirPendientes(destinoId, archivosPendientes);

    if (exito) {
      navegarAEdicion(destinoId);
    }
  }

  async function reintentarSubida() {
    if (!destinoCreadoId) {
      return;
    }

    const fallidos = archivosPendientes.filter((pendiente) => {
      const item = estadoSubidas.find((subida) => subida.id === pendiente.id);
      return item?.estado !== "ok";
    });

    const exito = await subirPendientes(destinoCreadoId, fallidos);

    if (exito) {
      navegarAEdicion(destinoCreadoId);
    }
  }

  function continuarSinSubir() {
    if (destinoCreadoId) {
      navegarAEdicion(destinoCreadoId);
    }
  }

  const errorCarga =
    isError && error instanceof Error
      ? error.message
      : "No pudimos cargar el destino que querés editar.";

  const overlaySubida = subiendo || Boolean(errorSubida);

  return (
    <PrivateShell
      eyebrow="Administración · Destinos"
      titulo={editando ? "Editar destino" : "Nuevo destino"}
      descripcion={
        editando
          ? "Modificá los datos del destino. Los cambios se reflejan en el catálogo público en cuanto guardás."
          : "Cargá un destino nuevo al catálogo. Podés adjuntar las fotos ahora: se suben solas al guardar."
      }
    >
      <div className="mb-6">
        <Link
          to="/mi-cuenta/destinos"
          className="inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#8D4F32] transition hover:text-[#233128]"
        >
          <span aria-hidden="true">←</span> Volver al listado
        </Link>
      </div>

      <div className="overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]">
        <div className="border-b border-[#5B3A29]/15 px-5 py-5 sm:px-8">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
            01 / {editando ? "Edición" : "Registro"}
          </p>

          <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
            {editando ? "Datos del destino" : "Datos del destino nuevo"}
          </h2>
        </div>

        <div className="px-5 py-7 sm:px-8">
          {/* =========================================================
              ESTADOS DE CARGA Y ERROR (solo al editar)
          ========================================================== */}
          {editando && isPending && (
            <div role="status" className="space-y-4">
              <p className="text-sm font-semibold text-[#746D63]">
                Cargando los datos del destino…
              </p>

              {Array.from({ length: 5 }).map((_, indice) => (
                <div
                  key={indice}
                  className="h-12 animate-pulse bg-[#5B3A29]/[0.07]"
                />
              ))}
            </div>
          )}

          {editando && isError && (
            <div className="py-6 text-center">
              <p role="alert" className="text-sm font-semibold text-[#9A3B2E]">
                {errorCarga}
              </p>

              <Link
                to="/mi-cuenta/destinos"
                className="mt-5 inline-block border border-[#5B3A29]/20 px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#2F4B3B] transition hover:border-[#233128]"
              >
                Volver al listado
              </Link>
            </div>
          )}

          {/* =========================================================
              FORMULARIO
          ========================================================== */}
          {(!editando || (destino && !isPending && !isError)) && (
            <DestinoForm
              // `idDestino` es lo que decide el método: con id hace PATCH,
              // sin él hace POST. La página no pasa un "modo" aparte para que
              // no puedan desincronizarse el texto y la operación.
              idDestino={id}
              valoresIniciales={
                editando && destino ? valoresDesdeDestino(destino) : VALORES_INICIALES
              }
              categorias={categorias ?? []}
              // La espera cubre **también** las categorías, y no solo el
              // destino. Sin esto, en alta el formulario se habilitaba antes
              // de que `/turismo/categorias/` respondiera: se veía "No hay
              // categorías activas" y el botón de guardar ya estaba activo, así
              // que un alta rápida publicaba el destino sin ninguna categoría.
              //
              // Ojo con `isPending`: en alta `useDestinoAdmin` va con
              // `enabled: false` (no hay id que buscar) y una query
              // deshabilitada se queda en estado `pending` para siempre. Si se
              // tomara sin condicionar, el formulario quedaría bloqueado
              // eternamente en `/nuevo`. Por eso se mira solo al editar.
              pendienteCarga={(editando && isPending) || cargandoCategorias}
              alGuardar={alGuardar}
            />
          )}
        </div>
      </div>

      {/* =========================================================
          GALERÍA EN BORRADOR (solo al crear: se sube tras el POST)
      ========================================================== */}
      {!editando && (
        <div className="mt-6">
          <GaleriaNueva
            archivos={archivosPendientes}
            onAgregar={agregarPendientes}
            onQuitar={quitarPendiente}
            deshabilitado={subiendo}
          />
        </div>
      )}

      {/* =========================================================
          GALERÍA DE FOTOS (solo al editar: necesita el UUID)
      ========================================================== */}
      {editando && destino && !isPending && !isError && (
        <div className="mt-6">
          <GaleriaAdmin
            atractivoId={destino.id_atractivo}
            fotosIniciales={destino.fotos}
          />
        </div>
      )}

      {/* =========================================================
          PROGRESO DE SUBIDA POST-ALTA
      ========================================================== */}
      {overlaySubida && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Subiendo archivos del destino"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#233128]/55 px-4 py-10 backdrop-blur-sm"
        >
          <div className="w-full max-w-md overflow-hidden border border-[#5B3A29]/15 bg-[#FFFDF8]">
            <div className="border-b border-[#5B3A29]/15 px-6 py-5 sm:px-7">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
                Carga de archivos
              </p>

              <h2 className="mt-1.5 font-display text-xl font-black tracking-[-0.02em] text-[#233128]">
                {errorSubida
                  ? "Algunos archivos no se subieron"
                  : "Subiendo archivos…"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#746D63]">
                {errorSubida
                  ? "El destino ya se creó. Podés reintentar o continuar y cargarlos desde la edición."
                  : "El destino se creó. Esperá a que terminen las subidas."}
              </p>
            </div>

            <ul className="space-y-4 px-7 py-6">
              {estadoSubidas.map((item) => {
                const porcentaje =
                  item.estado === "ok" ? 100 : item.porcentaje;

                return (
                  <li key={item.id}>
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                      <span className="truncate text-[#514B43]">
                        {item.nombre}
                      </span>
                      <span
                        className={
                          item.estado === "error"
                            ? "shrink-0 text-[#9A3B2E]"
                            : "shrink-0 text-[#2F4B3B]"
                        }
                      >
                        {item.estado === "ok"
                          ? "Lista"
                          : item.estado === "error"
                            ? "Falló"
                            : `${item.porcentaje}%`}
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-[#5B3A29]/10">
                      <div
                        className={`h-full transition-[width] duration-200 ${
                          item.estado === "error" ? "bg-[#9A3B2E]" : "bg-[#2F4B3B]"
                        }`}
                        style={{ width: `${Math.max(porcentaje, 4)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {errorSubida && (
              <div className="space-y-4 border-t border-[#5B3A29]/15 px-6 py-5 sm:px-7">
                <p
                  role="alert"
                  className="border-l-2 border-[#9A5B3C]/50 bg-[#F6E8DF]/60 px-4 py-3 text-xs font-semibold leading-5 text-[#713A2A]"
                >
                  {errorSubida}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void reintentarSubida()}
                    className="bg-[#233128] px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#FFFDF8] transition hover:bg-[#2F4B3B]"
                  >
                    Reintentar
                  </button>

                  <button
                    type="button"
                    onClick={continuarSinSubir}
                    className="border border-[#5B3A29]/20 px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#2F4B3B] transition hover:border-[#233128]"
                  >
                    Continuar sin subir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PrivateShell>
  );
}
