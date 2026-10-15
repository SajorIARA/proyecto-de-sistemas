/**
 * Formulario interactivo de preferencias y restricciones del turista.
 *
 * Reúne los tres capturadores pedidos (issue #23) más el punto de partida:
 *
 * 1. Chips de categorías temáticas (multi-selección).
 * 2. Slider de presupuesto tope en BOB.
 * 3. Selector de duración de la visita (horas o días).
 * 4. Punto de partida espacial (opcional, validado contra el bbox de La Paz).
 *
 * Validación y feedback: los errores se calculan en cada render y se muestran
 * en cuanto el campo fue tocado o se intentó guardar; no se espera al backend.
 * El estado del borrador vive en el contexto global y se respalda en
 * `localStorage`, así que sobrevive a una recarga.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DURACION, limitesDuracion } from "../../../config/preferencias";
import type {
  ConsultaInput,
  UnidadDuracion,
} from "../../../types/preferencias";
import { useCategorias } from "../../turismo/hooks/useTurismo";
import { usePreferencias } from "../context/PreferenciasContext";
import { useGuardarPerfil, useMisPreferencias } from "../hooks/usePreferencias";
import {
  duracionAHoras,
  formatearBob,
  limitar,
  parsearCoordenada,
  redondearAPaso,
  validarPreferencias,
  type CampoPreferencias,
} from "../utils/validaciones";
import { ChipsCategorias } from "./ChipsCategorias";
import { PuntoPartida } from "./PuntoPartida";
import { SelectorDuracion } from "./SelectorDuracion";
import { SliderPresupuesto } from "./SliderPresupuesto";

const CAMPOS: CampoPreferencias[] = [
  "categorias",
  "presupuesto",
  "duracion",
  "puntoPartida",
];

function horaCorta(marca: number): string {
  return new Date(marca).toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PreferenciasForm() {
  const {
    borrador,
    hayBorrador,
    guardadoEn,
    actualizar,
    reemplazar,
    descartar,
    marcarGuardado,
  } = usePreferencias();

  const {
    data: categorias = [],
    isLoading: cargandoCategorias,
    error: errorCategorias,
  } = useCategorias();
  const { data: preferenciasGuardadas } = useMisPreferencias();
  const { guardar, exito, error, apiError, pendiente, limpiar } =
    useGuardarPerfil();

  const [tocados, setTocados] = useState<Set<CampoPreferencias>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);

  const errores = validarPreferencias(borrador);
  const hayErrores = Object.keys(errores).length > 0;

  /**
   * Precarga las categorías ya guardadas en el backend, pero solo si no hay
   * un borrador local en curso (respetamos lo que el turista ya escribió).
   */
  const precargado = useRef(false);

  useEffect(() => {
    if (precargado.current || !preferenciasGuardadas) {
      return;
    }

    precargado.current = true;

    if (hayBorrador) {
      return;
    }

    const ids = preferenciasGuardadas.map((preferencia) => preferencia.categoria);

    if (ids.length > 0) {
      reemplazar({ ...borrador, categorias: ids });
    }
    // `borrador` y `reemplazar` se leen una sola vez gracias a `precargado`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferenciasGuardadas, hayBorrador]);

  function marcarTocado(campo: CampoPreferencias) {
    setTocados((previos) => {
      if (previos.has(campo)) {
        return previos;
      }

      const siguiente = new Set(previos);
      siguiente.add(campo);

      return siguiente;
    });
  }

  function reiniciarResultado() {
    if (exito || apiError) {
      limpiar();
    }
  }

  function cambiarCategorias(ids: number[]) {
    marcarTocado("categorias");
    reiniciarResultado();
    actualizar({ categorias: ids });
  }

  function alternarCategoria(id: number) {
    const actuales = borrador.categorias;
    const siguientes = actuales.includes(id)
      ? actuales.filter((categoria) => categoria !== id)
      : [...actuales, id];

    cambiarCategorias(siguientes);
  }

  function cambiarPresupuesto(valor: number) {
    marcarTocado("presupuesto");
    reiniciarResultado();
    actualizar({ presupuestoBob: valor });
  }

  function cambiarDuracionValor(valor: number) {
    marcarTocado("duracion");
    reiniciarResultado();
    actualizar({ duracionValor: valor });
  }

  /** Cambia de unidad conservando la duración equivalente en horas. */
  function cambiarUnidad(unidad: UnidadDuracion) {
    if (unidad === borrador.duracionUnidad) {
      return;
    }

    marcarTocado("duracion");
    reiniciarResultado();

    const horas = duracionAHoras(borrador.duracionValor, borrador.duracionUnidad);
    const limites = limitesDuracion(unidad);
    const bruto = unidad === "dias" ? horas / 24 : horas;
    const valor = limitar(
      redondearAPaso(bruto, limites.paso),
      limites.min,
      limites.max,
    );

    actualizar({ duracionUnidad: unidad, duracionValor: valor });
  }

  function cambiarLatitud(valor: string) {
    marcarTocado("puntoPartida");
    reiniciarResultado();
    actualizar({ latitud: valor });
  }

  function cambiarLongitud(valor: string) {
    marcarTocado("puntoPartida");
    reiniciarResultado();
    actualizar({ longitud: valor });
  }

  function descartarTodo() {
    descartar();
    setTocados(new Set());
    setAviso(null);
    limpiar();
  }

  /** Arma la consulta de restricciones; `null` si no hay punto de partida. */
  function construirConsulta(): ConsultaInput | null {
    const latitud = parsearCoordenada(borrador.latitud);
    const longitud = parsearCoordenada(borrador.longitud);

    if (latitud === null || longitud === null) {
      return null;
    }

    const horas = duracionAHoras(borrador.duracionValor, borrador.duracionUnidad);

    return {
      presupuesto_bob: borrador.presupuestoBob,
      tiempo_horas: Number(horas.toFixed(2)),
      punto_partida: { coordinates: [longitud, latitud] },
    };
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTocados(new Set(CAMPOS));
    setAviso(null);

    if (hayErrores) {
      setAviso("Revisa los campos marcados antes de guardar.");
      return;
    }

    const ok = await guardar({
      categorias: borrador.categorias,
      consulta: construirConsulta(),
    });

    if (ok) {
      marcarGuardado();
      setTocados(new Set());
    }
  }

  const mensajesBackend = (campo: string) => apiError?.mensajesDe(campo) ?? [];
  const errorPresupuesto =
    (tocados.has("presupuesto") ? errores.presupuesto : undefined) ??
    mensajesBackend("presupuesto_bob")[0];
  const errorDuracion =
    (tocados.has("duracion") ? errores.duracion : undefined) ??
    mensajesBackend("tiempo_horas")[0];
  const errorPunto =
    (tocados.has("puntoPartida") ? errores.puntoPartida : undefined) ??
    mensajesBackend("punto_partida")[0];
  const errorValidacionCategorias =
    (tocados.has("categorias") ? errores.categorias : undefined) ??
    mensajesBackend("categoria")[0];
  const horasTotales = duracionAHoras(
    borrador.duracionValor,
    borrador.duracionUnidad,
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="overflow-hidden rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.08)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />
          <h2 className="text-lg font-black tracking-tight text-[#233128]">
            Tus preferencias de viaje
          </h2>
        </div>

        {/* Indicador de respaldo local */}
        <p aria-live="polite" className="text-xs font-semibold text-[#746D63]">
          {hayBorrador && guardadoEn
            ? `Borrador guardado en este navegador a las ${horaCorta(guardadoEn)}.`
            : "Completa el formulario y guarda para aplicarlo a tus recomendaciones."}
        </p>
      </div>

      <div className="space-y-9 px-6 py-7 sm:px-8">
        {/* 1. Categorías */}
        <section>
          <header className="mb-4">
            <h3 className="text-sm font-black text-[#233128]">
              ¿Qué te interesa descubrir?
            </h3>
            <p className="mt-1 text-xs leading-6 text-[#746D63]">
              Elige una o varias categorías temáticas. Se guardan como tu nivel
              de interés en el perfil.
            </p>
          </header>

          <ChipsCategorias
            categorias={categorias}
            seleccionadas={borrador.categorias}
            onToggle={alternarCategoria}
            cargando={cargandoCategorias}
            errorCarga={
              errorCategorias
                ? "No pudimos cargar las categorías. Recarga la página e inténtalo de nuevo."
                : null
            }
            errorValidacion={errorValidacionCategorias}
            disabled={pendiente}
          />
        </section>

        <hr className="border-[#5B3A29]/[0.08]" />

        {/* 2. Presupuesto */}
        <section>
          <SliderPresupuesto
            valor={borrador.presupuestoBob}
            onChange={cambiarPresupuesto}
            error={errorPresupuesto}
            disabled={pendiente}
          />
        </section>

        <hr className="border-[#5B3A29]/[0.08]" />

        {/* 3. Duración */}
        <section>
          <SelectorDuracion
            valor={borrador.duracionValor}
            unidad={borrador.duracionUnidad}
            onValor={cambiarDuracionValor}
            onUnidad={cambiarUnidad}
            error={errorDuracion}
            disabled={pendiente}
          />
        </section>

        <hr className="border-[#5B3A29]/[0.08]" />

        {/* 4. Punto de partida */}
        <section>
          <PuntoPartida
            latitud={borrador.latitud}
            longitud={borrador.longitud}
            onLatitud={cambiarLatitud}
            onLongitud={cambiarLongitud}
            error={errorPunto}
            disabled={pendiente}
          />
        </section>

        {/* Resumen */}
        <div className="rounded-2xl border border-[#5B3A29]/[0.08] bg-[#F3EBDD]/50 px-5 py-4">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]">
            Resumen
          </p>

          <ul className="mt-2 space-y-1 text-sm text-[#514B43]">
            <li>
              <strong className="font-black text-[#233128]">
                {borrador.categorias.length}
              </strong>{" "}
              {borrador.categorias.length === 1
                ? "categoría seleccionada"
                : "categorías seleccionadas"}
            </li>
            <li>
              Presupuesto tope:{" "}
              <strong className="font-black text-[#233128]">
                {formatearBob(borrador.presupuestoBob)}
              </strong>
            </li>
            <li>
              Duración:{" "}
              <strong className="font-black text-[#233128]">
                {horasTotales} {horasTotales === 1 ? "hora" : "horas"}
              </strong>{" "}
              (máx. {DURACION.maxHoras} h)
            </li>
            <li>
              Punto de partida:{" "}
              <strong className="font-black text-[#233128]">
                {construirConsulta() ? "definido" : "sin definir"}
              </strong>
            </li>
          </ul>
        </div>

        {/* Aviso de validación del envío */}
        {aviso && (
          <p
            role="alert"
            className="rounded-2xl border border-[#9A3B2E]/25 bg-[#9A3B2E]/[0.07] px-4 py-3 text-sm font-semibold text-[#9A3B2E]"
          >
            {aviso}
          </p>
        )}

        {/* Error global del backend */}
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-[#9A3B2E]/25 bg-[#9A3B2E]/[0.07] px-4 py-3 text-sm font-semibold text-[#9A3B2E]"
          >
            {error}
          </p>
        )}

        {/* Confirmación */}
        {exito && (
          <p
            role="status"
            className="rounded-2xl border border-[#2F4B3B]/25 bg-[#2F4B3B]/[0.07] px-4 py-3 text-sm font-semibold text-[#2F4B3B]"
          >
            Preferencias guardadas. Tus recomendaciones ya las tienen en cuenta.
          </p>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pendiente || Boolean(errorCategorias)}
            className="inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pendiente ? "Guardando…" : "Guardar preferencias"}
          </button>

          <button
            type="button"
            onClick={descartarTodo}
            disabled={pendiente || !hayBorrador}
            className="rounded-full border border-[#5B3A29]/20 px-6 py-3 text-sm font-black text-[#514B43] transition hover:border-[#9A5B3C]/45 hover:text-[#8D4F32] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Descartar borrador
          </button>

          {hayErrores && (
            <p className="text-xs font-semibold text-[#9A3B2E]">
              Faltan datos por corregir.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
