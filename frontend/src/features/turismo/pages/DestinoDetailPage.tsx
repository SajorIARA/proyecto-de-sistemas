/**
 * Vista individual de un destino — ruta `/destinos/:id`.
 *
 * Alcance del sprint:
 *  - carga asíncrona del destino por id (sin recargas del navegador);
 *  - galería de imágenes (preparada para Cloudinary, con marcador de
 *    marca mientras el backend no envíe fotos);
 *  - descripción del destino (el backend no expone un campo aparte de
 *    historia/cultura, por eso no se duplica el mismo texto);
 *  - horario de atención y costos oficiales (endpoints `/horarios/` y
 *    `/tarifas/`, filtrados en cliente porque el backend no expone
 *    filter backends);
 *  - espacio reservado para el mapa con la coordenada PostGIS;
 *  - botón de retorno al catálogo que conserva la categoría activa;
 *  - manejo de 404 con mensaje propio y reintento ante otros errores.
 */

import { Link, useParams, useSearchParams } from "react-router-dom";
import { TurismoApiError } from "../api/turismoApi";
import { useDestino } from "../hooks/useTurismo";
import { formatearDuracion, formatearCoordenadas } from "../utils/formato";
import { CatalogoError } from "../components/CatalogoError";
import { CategoriaBadge } from "../components/CategoriaBadge";
import { DetalleSkeleton } from "../components/Skeletons";
import { GaleriaDestino } from "../components/GaleriaDestino";
import { HorarioTabla } from "../components/HorarioTabla";
import { MapaDestino } from "../components/MapaDestino";
import { TarifaTabla } from "../components/TarifaTabla";
import { EncabezadoImagen } from "../../../components/EncabezadoImagen";

export function DestinoDetailPage() {
  const { id = "" } = useParams();
  const [parametros] = useSearchParams();

  // Conserva el filtro de categoría al volver al catálogo.
  const volverA = parametros.get("categoria")
    ? `/destinos?categoria=${encodeURIComponent(parametros.get("categoria") as string)}`
    : "/destinos";

  const { data: destino, isPending, isError, error, refetch } = useDestino(id);

  if (isPending) {
    return (
      <main className="min-h-screen bg-[#F3EBDD] px-6 py-14 text-[#263029] sm:px-8 lg:px-10">
        <div className="contenedor-medio">
          <Link
            to={volverA}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#8D4F32] underline-offset-4 hover:underline"
          >
            <span aria-hidden="true">←</span> Volver al catálogo
          </Link>

          <div className="mt-10">
            <DetalleSkeleton />
          </div>
        </div>
      </main>
    );
  }

  if (isError) {
    const noExiste = error instanceof TurismoApiError && error.esNoEncontrado;

    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EBDD] px-6 py-16 text-[#263029]">
        <div className="w-full max-w-lg text-center">
          {noExiste ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9A5B3C]">
                Error 404
              </p>

              <span
                className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#2F4B3B]/10 text-4xl"
                aria-hidden="true"
              >
                🧭
              </span>

              <h1 className="mt-6 text-3xl font-black tracking-[-0.03em] text-[#233128]">
                No encontramos este destino
              </h1>

              <p className="mt-4 text-sm leading-6 text-[#514B43]">
                El atractivo que buscas no existe o ya no está disponible en
                nuestro catálogo. Puede que haya cambiado su nombre o que se
                haya dado de baja.
              </p>

              <Link
                to={volverA}
                className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-7 py-3.5 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128]"
              >
                Volver al catálogo
                <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <CatalogoError
              onReintentar={() => void refetch()}
              mensaje={
                error instanceof Error
                  ? error.message
                  : "No pudimos cargar la información de este destino."
              }
            />
          )}
        </div>
      </main>
    );
  }

  if (!destino) {
    return null;
  }

  const duracion = formatearDuracion(destino.duracion_minutos);

  return (
    <main className="min-h-screen bg-[#F3EBDD] text-[#263029]">
      {/* =========================================================
          CABECERA
      ========================================================== */}
      <header className="relative overflow-hidden border-b border-[#5B3A29]/[0.08] bg-[#233128]">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(233,223,201,.35) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(233,223,201,.35) 25%, transparent 25%)
            `,
            backgroundSize: "52px 52px",
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#C6923B]/22 blur-[120px]"
          aria-hidden="true"
        />

        <div className="contenedor-medio relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <Link
            to={volverA}
            className="inline-flex items-center gap-2.5 rounded-full border border-[#E9DFC9]/20 bg-[#1A241C]/35 px-4 py-2.5 text-xs font-black text-[#F3EBDD] backdrop-blur-xl transition hover:bg-[#1A241C]/60"
          >
            <span aria-hidden="true">←</span>
            Volver al catálogo
          </Link>

          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              {destino.categorias.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {destino.categorias.map((categoria) => (
                    <span
                      key={categoria}
                      className="inline-flex items-center rounded-full border border-[#E9DFC9]/25 bg-[#1A241C]/40 px-1 py-1 backdrop-blur-xl"
                    >
                      <CategoriaBadge categoria={categoria} />
                    </span>
                  ))}
                </div>
              )}

              <h1 className="mt-5 text-[clamp(2.2rem,5.5vw,3.8rem)] font-black leading-[0.98] tracking-[-0.04em] text-[#FFFDF8]">
                {destino.nombre}
              </h1>

              <p className="mt-5 flex items-start gap-2.5 text-sm font-semibold text-[#E8D8B7]/85">
                <span className="mt-px" aria-hidden="true">
                  📍
                </span>

                <span>
                  {destino.direccion?.trim() || "Ubicación no registrada"}
                </span>
              </p>

              {/* Datos rápidos */}
              <dl className="mt-8 flex flex-wrap gap-3">
                <DatoRapido
                  etiqueta="Tiempo de visita"
                  valor={duracion}
                  insignia="⏱"
                />

                <DatoRapido
                  etiqueta="Coordenadas"
                  valor={formatearCoordenadas(destino.ubicacion)}
                  insignia="🧭"
                />

                <DatoRapido
                  etiqueta="Fuente"
                  valor={destino.fuente_origen}
                  insignia="🗂️"
                />
              </dl>
            </div>

            <EncabezadoImagen
              prioritaria
              className="h-28 w-auto max-w-[42%] shrink-0 sm:h-40 lg:h-52"
            />
          </div>
        </div>
      </header>

      {/* =========================================================
          CONTENIDO
      ========================================================== */}
      <div className="contenedor-medio px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        <GaleriaDestino atractivo={destino} />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
          {/* Columna principal */}
          <div className="space-y-10">
            <section aria-labelledby="descripcion-destino">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#9A5B3C]">
                Sobre el destino
              </p>

              <h2
                id="descripcion-destino"
                className="mt-2 text-2xl font-black tracking-[-0.02em] text-[#233128]"
              >
                Descripción
              </h2>

              <p className="mt-5 whitespace-pre-line text-[0.95rem] leading-7 text-[#3F3A34]">
                {destino.descripcion ||
                  "La descripción de este destino estará disponible próximamente."}
              </p>
            </section>

            <MapaDestino
              ubicacion={destino.ubicacion}
              nombreDestino={destino.nombre}
            />
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            <HorarioTabla destinoId={destino.id} />

            <TarifaTabla destinoId={destino.id} />
          </div>
        </div>

        {/* Navegación inferior */}
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-[#5B3A29]/[0.08] pt-10 text-center">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-[#8A8177]">
            Sigue explorando
          </p>

          <Link
            to={volverA}
            className="inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-7 py-3.5 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128]"
          >
            Volver al catálogo
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Métrica destacada bajo el titular. */
function DatoRapido({
  etiqueta,
  valor,
  insignia,
}: {
  etiqueta: string;
  valor: string;
  insignia: string;
}) {
  return (
    <div className="min-w-[9rem] rounded-[1.1rem] border border-[#E9DFC9]/12 bg-[#F5EFE4]/[0.07] px-4 py-3 backdrop-blur-xl">
      <dt className="flex items-center gap-2 text-[0.55rem] font-black uppercase tracking-[0.2em] text-[#E8D8B7]/60">
        <span aria-hidden="true">{insignia}</span>
        {etiqueta}
      </dt>

      <dd className="mt-1.5 text-sm font-black text-[#FFFDF8]">{valor}</dd>
    </div>
  );
}
