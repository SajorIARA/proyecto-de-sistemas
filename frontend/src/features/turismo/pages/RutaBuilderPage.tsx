import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import { Button, ButtonLink } from "../../../design-system/components/Button";
import { ProgressSteps } from "../../../design-system/components/ProgressSteps";
import type { Atractivo, Horario, Tarifa } from "../../../types/turismo";
import { useAuth } from "../../auth/context/AuthContext";
import {
  listarAtractivos,
  listarFacetas,
  listarHorariosDe,
  listarTarifas,
  listarTarifasDe,
} from "../api/turismoApi";
import { CatalogoFiltros } from "../components/CatalogoFiltros";
import { DestinoImagen } from "../components/DestinoImagen";
import { MapaRuta, type RespuestaRuteo } from "../components/MapaRuta";
import { SelectorPuntoPartida } from "../components/SelectorPuntoPartida";
import { useRuta } from "../context/RutaContext";
import { useFiltrosCatalogo } from "../hooks/useFiltrosCatalogo";
import { formatearDuracion, recortar } from "../utils/formato";
import {
  conPuntoPartida,
  etiquetaPuntoPartida,
  leerPuntoPartida,
  type PuntoPartidaRuta,
} from "../utils/puntoPartida";

const PASOS = [
  { etiqueta: "Condiciones", descripcion: "Tiempo e intereses" },
  { etiqueta: "Diseñar ruta", descripcion: "Filtra, elige y organiza" },
  { etiqueta: "Revisar", descripcion: "Detalle y confirmación" },
];

const DURACIONES = [
  ["2-horas", "2 horas"],
  ["medio-dia", "Medio día"],
  ["dia", "Todo el día"],
] as const;

interface DetalleParada {
  id: string;
  horarios: Horario[];
  tarifas: Tarifa[];
}

function numeroTarifa(tarifa: Tarifa): number | null {
  const valor = Number(tarifa.monto);
  return Number.isFinite(valor) ? valor : null;
}

function formatearPrecio(valor: number): string {
  if (valor === 0) return "Gratis";
  return `Bs ${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 2,
  }).format(valor)}`;
}

export function RutaBuilderPage({ embebido = false }: { embebido?: boolean }) {
  const filtrosCatalogo = useFiltrosCatalogo();
  const { filtros } = filtrosCatalogo;
  const consultaCatalogo = useQuery({
    queryKey: ["turismo", "atractivos", "constructor-ruta", filtros],
    queryFn: () => listarAtractivos({ ...filtros, pageSize: 100 }),
    staleTime: 2 * 60 * 1000,
  });
  const consultaMetadatos = useQuery({
    queryKey: ["turismo", "constructor-ruta", "facetas-y-tarifas"],
    queryFn: async () => {
      const [facetas, tarifas] = await Promise.all([
        listarFacetas(),
        listarTarifas().catch(() => []),
      ]);
      return { facetas, tarifas };
    },
    staleTime: 10 * 60 * 1000,
  });
  const {
    destinos: paradas,
    contiene,
    alternar,
    rutas,
    rutaActivaId,
    seleccionarRuta,
    crearRuta,
    renombrarRuta,
    guardarRuta,
    guardando,
    errorRuta,
  } = useRuta();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const inventario = consultaCatalogo.data?.results ?? [];
  const origen = useMemo(() => leerPuntoPartida(parametros), [parametros]);
  const [ruteo, setRuteo] = useState<RespuestaRuteo | null>(null);
  const [paso, setPaso] = useState(() => {
    const pasoInicial = parametros.get("paso");
    return pasoInicial === "3" || pasoInicial === "4" ? 3 : 2;
  });
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [duracion, setDuracion] = useState(() => {
    const tiempoInicial = parametros.get("tiempo");
    return tiempoInicial &&
      DURACIONES.some(([valor]) => valor === tiempoInicial)
      ? tiempoInicial
      : "medio-dia";
  });
  const [interes, setInteres] = useState("Cultura");
  const paradasClave = paradas.map((parada) => parada.id).join(",");
  // Horarios y tarifas reales de las paradas, solo al llegar a la revisión.
  // Se consultan por destino porque el backend no filtra por `atractivo`.
  const consultaDetalle = useQuery({
    queryKey: ["turismo", "revision-ruta", paradasClave],
    queryFn: async () => {
      const detalle = await Promise.all(
        paradas.map(async (parada) => ({
          id: parada.id,
          horarios: await listarHorariosDe(parada.id).catch(() => []),
          tarifas: await listarTarifasDe(parada.id).catch(() => []),
        })),
      );
      return { detalle };
    },
    enabled: paso === 3 && paradas.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const etiquetaDuracion =
    DURACIONES.find(([valor]) => valor === duracion)?.[1] ?? "Medio día";
  const rutaActiva = rutas.find((ruta) => ruta.id === rutaActivaId) ?? rutas[0];
  const regresoAlConstructor = `${location.pathname}${location.search}`;
  const seleccionado =
    inventario.find((destino) => destino.id === seleccionadoId) ??
    paradas.find((destino) => destino.id === seleccionadoId) ??
    paradas[0] ??
    inventario[0] ??
    null;

  const precios = useMemo(() => {
    const agrupados = new Map<string, number[]>();
    for (const tarifa of consultaMetadatos.data?.tarifas ?? []) {
      const monto = numeroTarifa(tarifa);
      if (monto === null || tarifa.atractivo === null) continue;
      const id = String(tarifa.atractivo);
      agrupados.set(id, [...(agrupados.get(id) ?? []), monto]);
    }
    return new Map(
      [...agrupados].map(([id, montos]) => [id, Math.min(...montos)]),
    );
  }, [consultaMetadatos.data?.tarifas]);

  const sugerencias = useMemo(() => {
    const categoriasRuta = new Set(
      paradas.flatMap((parada) =>
        parada.categorias.map((categoria) => categoria.toLowerCase()),
      ),
    );
    return [...inventario]
      .filter((destino) => !contiene(destino.id))
      .sort((a, b) => {
        const puntaje = (destino: Atractivo) =>
          destino.categorias.reduce(
            (total, categoria) =>
              total +
              (categoriasRuta.has(categoria.toLowerCase()) ? 2 : 0) +
              (categoria.toLowerCase() === interes.toLowerCase() ? 1 : 0),
            0,
          ) + (destino.ubicacion ? 1 : 0);
        return puntaje(b) - puntaje(a);
      })
      .slice(0, 4);
  }, [contiene, interes, inventario, paradas]);

  const destinosMapa = useMemo(() => {
    const unicos = new Map<string, Atractivo>();
    [...inventario, ...paradas].forEach((destino) =>
      unicos.set(destino.id, destino),
    );
    return [...unicos.values()];
  }, [inventario, paradas]);

  const duracionTotal = paradas.reduce(
    (total, destino) => total + (destino.duracion_minutos ?? 0),
    0,
  );
  const sinUbicacion = paradas.filter((destino) => !destino.ubicacion).length;
  const sinDuracion = paradas.filter(
    (destino) => !destino.duracion_minutos,
  ).length;
  const paradasConPrecio = paradas.filter((destino) =>
    precios.has(destino.id),
  );
  const costoMinimo = paradasConPrecio.reduce(
    (total, destino) => total + (precios.get(destino.id) ?? 0),
    0,
  );

  function alternarParada(destino: Atractivo) {
    alternar(destino);
    setSeleccionadoId(destino.id);
  }

  /** Fija o quita el origen en la URL, como el resto de los filtros. */
  function cambiarOrigen(nuevo: PuntoPartidaRuta | null) {
    setParametros((previos) => conPuntoPartida(previos, nuevo), {
      replace: true,
    });
    setRuteo(null);
  }

  async function finalizarRuta() {
    if (!isAuthenticated) {
      // Conservar origen y filtros: el turista vuelve exactamente a la
      // revisión que estaba armando, no a un constructor vacío.
      const parametrosRegreso = new URLSearchParams(location.search);
      parametrosRegreso.set("paso", "3");
      const regreso = encodeURIComponent(
        `${location.pathname}?${parametrosRegreso.toString()}`,
      );
      navigate(`/login?redirect=${regreso}`);
      return;
    }
    const guardado = await guardarRuta();
    if (guardado) navigate("/ruta");
  }

  /** Horario vigente del día de hoy, o un aviso explícito si no hay datos. */
  function horarioDeHoy(paradaId: string): string {
    const registro = (consultaDetalle.data as { detalle?: DetalleParada[] } | undefined)
      ?.detalle?.find((item) => item.id === paradaId);
    const horarios = registro?.horarios ?? [];
    if (horarios.length === 0) return "Sin horarios registrados";
    const dia = new Date().getDay() || 7;
    const horario = horarios.find((item) => item.dia_semana === dia && !item.cerrado);
    if (!horario) return "Cerrado hoy / sin horario vigente";
    return `${horario.hora_apertura ?? "?"} – ${horario.hora_cierre ?? "?"}`;
  }

  function tarifaDe(paradaId: string): string {
    const registro = (consultaDetalle.data as { detalle?: DetalleParada[] } | undefined)
      ?.detalle?.find((item) => item.id === paradaId);
    const tarifas = registro?.tarifas ?? [];
    if (tarifas.length === 0) return "Sin tarifas registradas";
    const montos = tarifas
      .map((tarifa) => Number(tarifa.monto))
      .filter((monto) => Number.isFinite(monto));
    if (montos.length === 0) return "Tarifas sin monto";
    const minimo = Math.min(...montos);
    return minimo === 0 ? "Entrada gratuita" : `Desde Bs ${minimo}`;
  }

  return (
    <div
      className={
        embebido
          ? "space-y-7"
          : "chuki-page min-h-screen bg-[var(--color-canvas)] p-4 sm:p-8"
      }
    >
      <div className={embebido ? "space-y-7" : "contenedor-amplio space-y-7"}>
        {!embebido && (
          <header className="border-b border-[var(--color-border)] pb-7">
            <Link to="/ruta" className="inline-flex min-h-11 items-center font-bold">
              ← Mis viajes
            </Link>
            <h1 className="mt-3 text-4xl font-black">Planifica tu recorrido</h1>
          </header>
        )}

        <section className="lp-planner-progress overflow-hidden bg-[var(--lp-night)] p-5 text-white shadow-[var(--lp-shadow-md)] sm:p-7">
          <p className="mb-5 font-data text-xs font-bold text-[var(--lp-sun)]">
            DE LA IDEA AL RECORRIDO
          </p>
          <ProgressSteps pasos={PASOS} actual={paso} />
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
            <span>
              Tiempo: <strong className="text-[var(--lp-sun)]">{etiquetaDuracion}</strong>
            </span>
            <span>
              Interés: <strong className="text-[var(--color-brand)]">{interes}</strong>
            </span>
            <button
              type="button"
              className="min-h-11 font-bold text-white underline decoration-white/50 underline-offset-4"
              onClick={() => setPaso(1)}
            >
              Cambiar condiciones
            </button>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Elegir viaje">
          {rutas.map((ruta) => (
            <button
              key={ruta.id}
              type="button"
              onClick={() => seleccionarRuta(ruta.id)}
              className={`lp-button min-h-11 shrink-0 px-4 text-sm font-bold ${
                ruta.id === rutaActivaId
                  ? "lp-button--route"
                  : "lp-button--secondary"
              }`}
            >
              {ruta.nombre} <span className="font-data">{ruta.destinos.length}</span>
            </button>
          ))}
          <Button variante="quiet" onClick={crearRuta} className="shrink-0">
            + Nuevo viaje
          </Button>
        </div>

        {paso === 1 && (
          <section className="lp-panel p-6 sm:p-8" aria-labelledby="condiciones-viaje">
            <h2 id="condiciones-viaje" className="text-2xl font-black">
              Define lo esencial
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Estas condiciones orientan las sugerencias; podrás filtrar el catálogo en el siguiente paso.
            </p>
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <fieldset>
                <legend className="font-bold">¿Cuánto tiempo tienes?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {DURACIONES.map(([valor, etiqueta]) => (
                    <label
                      key={valor}
                      className={`flex min-h-12 cursor-pointer items-center justify-center border px-3 text-center text-sm font-bold ${
                        duracion === valor
                          ? "border-[var(--color-border-strong)] bg-[var(--color-route-strong)] text-[var(--color-text)]"
                          : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="duracion-ruta"
                        value={valor}
                        checked={duracion === valor}
                        onChange={() => setDuracion(valor)}
                        className="sr-only"
                      />
                      {etiqueta}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-bold">¿Qué te interesa más?</legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["Cultura", "Naturaleza", "Miradores", "Gastronomía"].map(
                    (opcion) => (
                      <label
                        key={opcion}
                        className={`flex min-h-12 cursor-pointer items-center border px-4 text-sm font-bold ${
                          interes === opcion
                            ? "border-[var(--color-brand)] bg-[var(--color-route-strong)] text-[var(--color-text)]"
                            : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="interes-ruta"
                          value={opcion}
                          checked={interes === opcion}
                          onChange={() => setInteres(opcion)}
                          className="sr-only"
                        />
                        {opcion}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
            </div>
            <div className="mt-8 flex justify-end">
              <Button variante="primary" onClick={() => setPaso(2)}>
                Diseñar mi ruta
                <Icono nombre="flecha" className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {paso === 2 && (
          <section className="space-y-7" aria-labelledby="disenar-ruta">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="font-data text-xs font-bold text-[var(--color-action-hover)]">
                  PASO 2 · TODO EN UNA SOLA VISTA
                </p>
                <h2 id="disenar-ruta" className="mt-2 text-3xl font-black">
                  Elige y organiza tu recorrido
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Filtra como en un catálogo, compara precios y revisa al instante tu selección y las sugerencias.
                </p>
              </div>
              <Button
                variante="primary"
                disabled={paradas.length === 0}
                onClick={() => setPaso(3)}
              >
                Revisar ruta ({paradas.length})
              </Button>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] 2xl:grid-cols-[19rem_minmax(0,1fr)_22rem]">
              <aside className="chuki-route-filters rounded-[22px] border border-[var(--color-border)] shadow-[var(--lp-shadow-md)] lg:col-start-1 lg:row-start-1">
                <div className="bg-[var(--lp-night)] p-5 text-white">
                  <p className="font-data text-xs font-bold text-[var(--lp-sun)]">
                    FILTROS DEL CATÁLOGO
                  </p>
                  <h3 className="mt-2 text-xl font-black">Encuentra tu parada</h3>
                  <p className="mt-2 text-xs leading-5 text-white/75">
                    Búsqueda, categorías, zona y precio siempre visibles.
                  </p>
                </div>
                <CatalogoFiltros
                  filtros={filtros}
                  borrador={filtrosCatalogo.borrador}
                  facetas={consultaMetadatos.data?.facetas}
                  disabled={consultaCatalogo.isPending}
                  onBuscar={filtrosCatalogo.setBorrador}
                  onLimpiarTexto={filtrosCatalogo.limpiarTexto}
                  onCategoria={filtrosCatalogo.setCategoria}
                  onZona={filtrosCatalogo.setZona}
                  onPrecio={filtrosCatalogo.setRangoPrecio}
                  onLimpiar={filtrosCatalogo.limpiar}
                  siempreAbierto
                  className="chuki-builder-filters"
                />
                <SelectorPuntoPartida
                  origen={origen}
                  onCambiar={cambiarOrigen}
                />
              </aside>

              <section className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--lp-shadow-md)] lg:col-start-2 lg:row-start-1" aria-labelledby="destinos-disponibles">
                <div className="border-b-4 border-[var(--color-action)] bg-[var(--lp-night)] p-6 text-white">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 id="destinos-disponibles" className="lp-editorial-title text-4xl">
                        Destinos ({consultaCatalogo.isPending ? "…" : consultaCatalogo.data?.count ?? 0})
                      </h3>
                      <p className="mt-2 text-sm text-white/75">
                        Precio mostrado desde la tarifa pública más baja registrada.
                      </p>
                    </div>
                    {filtrosCatalogo.activos > 0 && (
                      <span className="bg-[var(--lp-sun)] px-3 py-2 font-data text-xs font-black text-[var(--lp-night)]">
                        {filtrosCatalogo.activos} filtros activos
                      </span>
                    )}
                  </div>
                </div>
                {consultaCatalogo.isPending && (
                  <p className="p-6 text-sm" role="status">
                    Cargando inventario…
                  </p>
                )}
                {consultaCatalogo.isError && (
                  <p className="p-6 text-sm font-bold text-[var(--color-danger)]">
                    No pudimos cargar los destinos con estos filtros.
                  </p>
                )}
                {!consultaCatalogo.isPending &&
                  !consultaCatalogo.isError &&
                  inventario.length === 0 && (
                    <div className="p-8 text-center">
                      <h4 className="text-xl font-black">No hay coincidencias</h4>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Prueba otra zona, categoría o rango de precio.
                      </p>
                      <Button variante="secondary" className="mt-5" onClick={filtrosCatalogo.limpiar}>
                        Limpiar filtros
                      </Button>
                    </div>
                  )}
                <ul className="grid auto-rows-fr gap-px bg-[var(--color-border)] md:grid-cols-2">
                  {inventario.map((destino) => {
                    const enRuta = contiene(destino.id);
                    const precio = precios.get(destino.id);
                    return (
                      <li key={destino.id} className="group flex h-full flex-col bg-[var(--color-surface)]">
                        <button
                          type="button"
                          onClick={() => setSeleccionadoId(destino.id)}
                          className="flex w-full flex-1 flex-col text-left"
                        >
                          <div className="relative h-44 overflow-hidden bg-[var(--lp-night)]">
                            <DestinoImagen
                              atractivo={destino}
                              categoria={destino.categorias[0] ?? null}
                              sizes="(min-width: 768px) 28vw, 100vw"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                            <span className="absolute left-3 top-3 bg-[var(--lp-night)] px-3 py-2 text-xs font-black text-white shadow-lg">
                              {consultaMetadatos.isPending
                                ? "Consultando precio…"
                                : precio === undefined
                                  ? "Precio no registrado"
                                  : precio === 0
                                    ? "Entrada gratuita"
                                    : `Desde ${formatearPrecio(precio)}`}
                            </span>
                          </div>
                          <div className="flex flex-1 flex-col p-5 pb-3">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-brand)]">
                              {destino.categorias.join(" · ") || "Destino turístico"}
                            </p>
                            <h4 className="mt-2 text-lg font-black">{destino.nombre}</h4>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
                              {recortar(destino.descripcion, 125) || "Sin descripción disponible."}
                            </p>
                            <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4 text-xs">
                              <div>
                                <dt className="text-[var(--color-text-muted)]">Duración</dt>
                                <dd className="mt-1 font-bold">
                                  {formatearDuracion(destino.duracion_minutos) || "Sin registrar"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[var(--color-text-muted)]">Zona / dirección</dt>
                                <dd className="mt-1 line-clamp-2 font-bold">
                                  {destino.direccion || "Sin registrar"}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </button>
                        <div className="flex gap-2 border-t border-[var(--color-border)] px-5 py-4">
                          <Button
                            variante={enRuta ? "route" : "primary"}
                            className="flex-1"
                            onClick={() => alternarParada(destino)}
                            aria-label={
                              enRuta
                                ? `Quitar ${destino.nombre} de la ruta`
                                : `Añadir ${destino.nombre} a la ruta`
                            }
                          >
                            {enRuta ? "✓ En mi ruta" : "+ Añadir"}
                          </Button>
                          <ButtonLink
                            to={`/destinos/${destino.id}?volver=${encodeURIComponent(regresoAlConstructor)}`}
                            variante="secondary"
                          >
                            Ver
                          </ButtonLink>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <aside className="space-y-5 lg:col-start-2 2xl:col-start-3 2xl:row-start-1 2xl:sticky 2xl:top-24">
                <section className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--lp-night)] text-white shadow-[var(--lp-shadow-md)]">
                  <div className="border-b border-white/15 p-5">
                    <p className="font-data text-xs font-bold text-[var(--lp-sun)]">TU RUTA</p>
                    <label htmlFor="nombre-ruta" className="mt-3 block text-xs font-bold text-white/75">
                      Nombre del viaje
                    </label>
                    <input
                      id="nombre-ruta"
                      value={rutaActiva.nombre}
                      onChange={(evento) => renombrarRuta(evento.target.value)}
                      className="mt-2 min-h-11 w-full border border-white/30 bg-[var(--color-canvas)] px-3 text-sm font-bold text-white caret-[var(--lp-sun)] outline-none focus:border-[var(--lp-sun)] focus:ring-2 focus:ring-[var(--lp-sun)]/30"
                    />
                  </div>
                  {paradas.length === 0 ? (
                    <p className="p-5 text-sm leading-6 text-white/75">
                      Añade un destino para construir el orden del recorrido.
                    </p>
                  ) : (
                    <ol className="divide-y divide-white/15">
                      {paradas.map((parada, indice) => (
                        <li key={parada.id} className="flex items-center gap-3 p-4">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-route)] font-data text-sm font-black text-[var(--lp-night)]">
                            {indice + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSeleccionadoId(parada.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block truncate text-sm font-bold">{parada.nombre}</span>
                            <span className="mt-1 block text-xs text-white/65">
                              {formatearDuracion(parada.duracion_minutos) || "Duración pendiente"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => alternar(parada)}
                            className="min-h-11 px-2 text-xs font-bold text-[var(--color-action)] underline"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="border-t border-white/15 p-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Tiempo de visitas</span>
                      <strong>{formatearDuracion(duracionTotal) || "Sin datos"}</strong>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-white/70">Costo mínimo conocido</span>
                      <strong>
                        {paradasConPrecio.length > 0 ? formatearPrecio(costoMinimo) : "Sin datos"}
                      </strong>
                    </div>
                  </div>
                </section>

                {seleccionado && (
                  <section className="lp-panel overflow-hidden" aria-labelledby="detalle-seleccionado">
                    <div className="h-32 overflow-hidden">
                      <DestinoImagen
                        atractivo={seleccionado}
                        categoria={seleccionado.categorias[0] ?? null}
                        sizes="352px"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-bold text-[var(--color-brand)]">DESTINO EN FOCO</p>
                      <h3 id="detalle-seleccionado" className="mt-2 text-lg font-black">
                        {seleccionado.nombre}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                        {recortar(seleccionado.descripcion, 145) || "Sin descripción disponible."}
                      </p>
                    </div>
                  </section>
                )}

                <section className="lp-panel p-5" aria-labelledby="sugerencias-ruta">
                  <h3 id="sugerencias-ruta" className="font-black">Sugerencias para completar</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                    Se priorizan afinidad con {interes.toLowerCase()}, categorías de tu ruta y ubicación disponible.
                  </p>
                  {consultaCatalogo.isPending ? (
                    <p className="mt-4 text-sm">Cargando sugerencias del inventario…</p>
                  ) : sugerencias.length === 0 ? (
                    <p className="mt-4 text-sm">No hay más sugerencias con los filtros actuales.</p>
                  ) : (
                    <ol className="mt-4 space-y-3">
                      {sugerencias.map((destino) => (
                        <li key={destino.id} className="border-t border-[var(--color-border)] pt-3">
                          <p className="text-sm font-bold">{destino.nombre}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            {precios.has(destino.id)
                              ? `Desde ${formatearPrecio(precios.get(destino.id) ?? 0)}`
                              : "Precio no registrado"}
                          </p>
                          <button
                            type="button"
                            onClick={() => alternarParada(destino)}
                            className="mt-2 min-h-11 text-sm font-bold text-[var(--color-action-hover)] underline underline-offset-4"
                          >
                            + Añadir sugerencia
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </aside>
            </div>

          </section>
        )}

        {paso === 3 && (
          <section className="space-y-7" aria-labelledby="revision-ruta">
            <div className="bg-[var(--lp-night)] p-6 text-white sm:p-8">
              <p className="font-data text-xs font-bold text-[var(--lp-sun)]">PASO 3 · REVISIÓN COMPLETA</p>
              <h2 id="revision-ruta" className="lp-editorial-title mt-3 text-4xl">
                Revisa cada parte antes de guardar
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
                Comprueba condiciones, orden, duración, precios registrados, ubicación y datos pendientes de cada parada.
              </p>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(28rem,1.15fr)] 2xl:grid-cols-[minmax(20rem,0.8fr)_minmax(32rem,1.2fr)_22rem]">
              <section className="lp-panel chuki-route-itinerary p-5 sm:p-7 xl:col-start-1 xl:row-start-1" aria-labelledby="itinerario-detallado">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="font-data text-xs font-bold text-[var(--color-brand)]">ITINERARIO</p>
                      <h3 id="itinerario-detallado" className="mt-2 text-2xl font-black">
                        {rutaActiva.nombre}
                      </h3>
                    </div>
                    <Button variante="secondary" onClick={() => setPaso(2)}>
                      Editar selección
                    </Button>
                  </div>
                  <ol
                    aria-label="Paradas del itinerario"
                    className="mt-6 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]"
                  >
                    {paradas.map((parada, indice) => {
                      const precio = precios.get(parada.id);
                      return (
                        <li
                          key={parada.id}
                          className="py-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-start gap-4">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--lp-night)] font-data text-sm font-black text-white">
                              {indice + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                                <h4 className="min-w-0 text-base font-black">{parada.nombre}</h4>
                                <strong className="shrink-0 rounded-sm bg-[var(--color-action)]/10 px-2.5 py-1.5 text-xs text-[var(--color-action)]">
                                  {precio === undefined
                                    ? "Precio no registrado"
                                    : precio === 0
                                      ? "Entrada gratuita"
                                      : `Desde ${formatearPrecio(precio)}`}
                                </strong>
                              </div>
                              <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 border-t border-[var(--color-border)]/70 pt-3 text-sm sm:grid-cols-3 2xl:grid-cols-1">
                                <DatoRevision
                                  etiqueta="Duración"
                                  valor={formatearDuracion(parada.duracion_minutos) || "No registrada"}
                                />
                                <DatoRevision
                                  etiqueta="Dirección"
                                  valor={parada.direccion || "No registrada"}
                                />
                                <DatoRevision
                                  etiqueta="Ubicación"
                                  valor={parada.ubicacion ? "Confirmada en mapa" : "Sin coordenadas"}
                                />
                                <DatoRevision
                                  etiqueta="Horario hoy"
                                  valor={horarioDeHoy(parada.id)}
                                />
                                <DatoRevision
                                  etiqueta="Tarifa"
                                  valor={tarifaDe(parada.id)}
                                />
                              </dl>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
              </section>

              <div className="w-full min-w-0 xl:col-start-2 xl:row-start-1">
                <MapaRuta
                  destinos={destinosMapa}
                  paradas={paradas}
                  seleccionadoId={seleccionado?.id ?? null}
                  onSeleccionar={setSeleccionadoId}
                  origen={origen}
                  onRuteo={setRuteo}
                />
              </div>

              <aside className="space-y-5 xl:col-span-2 2xl:col-span-1 2xl:col-start-3 2xl:row-start-1">
                <dl className="grid gap-px overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-1">
                  <Resumen etiqueta="Paradas" valor={String(paradas.length)} />
                  <Resumen etiqueta="Tiempo disponible" valor={etiquetaDuracion} />
                  <Resumen
                    etiqueta="Tiempo de visitas"
                    valor={formatearDuracion(duracionTotal) || "Sin datos"}
                  />
                  <Resumen
                    etiqueta="Punto de partida"
                    valor={origen ? etiquetaPuntoPartida(origen) : "Sin definir"}
                  />
                  <Resumen
                    etiqueta="Traslado desde el origen"
                    valor={
                      ruteo
                        ? `${formatearDuracion(ruteo.duracion_minutos)} · ${ruteo.distancia_km} km (ruta por calles)`
                        : origen
                          ? "No verificado"
                          : "Sin punto de partida"
                    }
                  />
                  <Resumen
                    etiqueta="Costo mínimo conocido"
                    valor={
                      paradasConPrecio.length > 0
                        ? `${formatearPrecio(costoMinimo)} · ${paradasConPrecio.length}/${paradas.length} con tarifa`
                        : "Sin tarifas registradas"
                    }
                  />
                </dl>

                <section className="lp-panel p-5">
                  <h3 className="font-black">Comprobaciones del plan</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-3 2xl:grid-cols-1">
                    <Aviso
                      tono={
                        paradas.length === 0 || sinUbicacion > 0 ? "warning" : "ok"
                      }
                      texto={
                        paradas.length === 0
                          ? "Añade al menos una parada para comprobar su ubicación."
                          : sinUbicacion > 0
                          ? `${sinUbicacion} paradas no tienen coordenadas confirmadas.`
                          : "Todas las paradas tienen ubicación registrada."
                      }
                    />
                    <Aviso
                      tono={
                        paradas.length === 0 || sinDuracion > 0 ? "warning" : "ok"
                      }
                      texto={
                        paradas.length === 0
                          ? "Añade al menos una parada para comprobar su duración."
                          : sinDuracion > 0
                          ? `${sinDuracion} paradas no tienen duración confirmada.`
                          : "Todas las paradas tienen duración registrada."
                      }
                    />
                    <Aviso
                      tono={
                        paradas.length > 0 &&
                        paradasConPrecio.length === paradas.length
                          ? "ok"
                          : "warning"
                      }
                      texto={
                        paradas.length === 0
                          ? "Añade al menos una parada para comprobar sus tarifas."
                          : paradasConPrecio.length === paradas.length
                          ? "Todas las paradas tienen al menos una tarifa registrada."
                          : `${paradas.length - paradasConPrecio.length} paradas no tienen tarifa; el total mostrado es parcial.`
                      }
                    />
                  </div>
                </section>

                <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--lp-night)] p-5 text-white shadow-[var(--lp-shadow-md)]">
                  <h3 className="text-xl font-black">Termina tu recorrido</h3>
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    {isAuthenticated
                      ? "Guarda este viaje en tu cuenta para retomarlo cuando quieras y registrar tus visitas."
                      : "Inicia sesión para guardar el viaje en tu cuenta. Mientras tanto, la selección se conserva en este navegador."}
                  </p>
                  {errorRuta && (
                    <p role="alert" className="mt-3 border-l-4 border-[var(--color-danger)] bg-white/10 p-3 text-sm font-bold text-[var(--color-action)]">
                      {errorRuta}
                    </p>
                  )}
                  <Button
                    variante="primary"
                    className="mt-5 w-full"
                    disabled={paradas.length === 0 || guardando}
                    onClick={() => void finalizarRuta()}
                  >
                    {guardando
                      ? "Guardando…"
                      : isAuthenticated
                        ? "Terminar y guardar viaje"
                        : "Ingresar para terminar"}
                  </Button>
                  <Button
                    variante="secondary"
                    className="mt-2 w-full"
                    onClick={() => setPaso(2)}
                  >
                    Volver a editar
                  </Button>
                </section>
              </aside>
            </div>
          </section>
        )}

        <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--color-border)] pt-5">
          <Button
            variante="quiet"
            disabled={paso === 1}
            onClick={() => setPaso((actual) => Math.max(1, actual - 1))}
          >
            ← Paso anterior
          </Button>
          <p className="self-center font-data text-xs text-[var(--color-text-muted)]">
            Paso {paso} de 3
          </p>
        </div>
      </div>
    </div>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-5">
      <dt className="text-xs font-bold text-[var(--color-text-muted)]">{etiqueta}</dt>
      <dd className="mt-2 font-data text-lg font-black text-[var(--color-text)]">{valor}</dd>
    </div>
  );
}

function DatoRevision({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[var(--color-text-muted)]">{etiqueta}</dt>
      <dd className="mt-1 font-bold text-[var(--color-text)]">{valor}</dd>
    </div>
  );
}

function Aviso({
  tono,
  texto,
}: {
  tono: "ok" | "warning";
  texto: string;
}) {
  return (
    <p
      className={`border-l-4 p-4 text-sm font-medium leading-6 ${
        tono === "ok"
          ? "border-[var(--color-brand)] bg-[var(--color-route-strong)] text-[var(--color-text)]"
          : "border-[var(--color-action)] bg-[var(--color-action)]/10 text-[var(--color-action)]"
      }`}
    >
      {texto}
    </p>
  );
}
