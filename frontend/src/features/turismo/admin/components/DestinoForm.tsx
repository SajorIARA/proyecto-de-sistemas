/**
 * Formulario de alta y edición de destinos (`AtractivoAdminSerializer`).
 *
 * Sirve para las dos operaciones porque el backend usa el mismo serializer en
 * `POST` y en `PATCH`: lo único que cambia es si se manda `id`.
 *
 * Decisiones que no son obvias:
 *
 * - **Los campos numéricos se guardan como texto.** Un `<input type="number">`
 *   controlado con un `number` en el estado manda `NaN` mientras el usuario
 *   borra el campo, y ese `NaN` termina en la URL de la API. Con texto se
 *   puede escribir a medio completar y el error se ve en el input.
 * - **La duración se valida antes de enviar.** `AtractivoAdminSerializer` no
 *   replica el CHECK `duracion_minutos > 0` de Postgres, así que un `0`
 *   devuelve 500 y no un 400. `validarFormulario` lo frena.
 * - **Las categorías son casillas, no un multiselect.** El backend espera
 *   ids de `Categoria.id_categoria` y las pide en la misma respuesta de
 *   `/turismo/categorias/` que ya consume el catálogo.
 * - **No se manda `area`.** En `AtractivoAdminSerializer` es un
 *   `SerializerMethodField()` (se hereda del serializer público), o sea de
 *   solo lectura: no entra en `validated_data` y un PATCH no puede borrarla.
 *   El polígono es además un `PolygonField` de GeoDjango y el mapa sigue
 *   siendo una reserva de espacio.
 */

import { useEffect, useId, useState, type FormEvent } from "react";
import {
  DIRECCION_MAX,
  FUENTE_ORIGEN_MAX,
  NOMBRE_MAX,
} from "../../../../config/turismo";
import type { Categoria, DestinoFormValues } from "../../../../types/turismo";
import { aPayload } from "../api/destinosAdminApi";
import { useGuardarDestino } from "../hooks/useDestinosAdmin";
import {
  alternarCategoria,
  esFormularioValido,
  validarFormulario,
  type CampoFormularioDestino,
  type ErroresFormulario,
} from "../utils/destinoForm";
import { CampoTexto, claseInput, idErrorDe, idPistaDe } from "./CampoTexto";

/** Los campos de `DestinoFormValues` que se editan como texto libre. */
type CampoEditable = Extract<
  keyof DestinoFormValues,
  | "nombre"
  | "descripcion"
  | "direccion"
  | "duracionMinutos"
  | "longitud"
  | "latitud"
  | "fuenteOrigen"
>;

export function DestinoForm({
  idDestino,
  valoresIniciales,
  categorias,
  pendienteCarga,
  alGuardar,
}: {
  /**
   * Id del destino a editar. Ausente = alta.
   *
   * Es la **única** fuente de verdad sobre si la operación es alta o edición,
   * y a la vez el que decide el método HTTP. Antes el componente recibía un
   * `modo: "crear" | "editar"` aparte y lo usaba solo para los textos: la
   * mutación se llamaba sin id, así que editar terminaba haciendo `POST` y
   * creaba un destino duplicado en vez de actualizar el existente.
   */
  idDestino?: string;
  /** Datos del destino en edición. En alta se ignoran. */
  valoresIniciales: DestinoFormValues;
  categorias: Categoria[];
  /** `true` mientras se cargan los datos del destino a editar. */
  pendienteCarga?: boolean;
  /** Se llama cuando el backend confirma el guardado. */
  alGuardar: () => void;
}) {
  const editando = Boolean(idDestino);

  const [valores, setValores] = useState<DestinoFormValues>(valoresIniciales);
  const [erroresLocales, setErroresLocales] = useState<ErroresFormulario>({});
  const [tocados, setTocados] = useState(false);

  const { guardar, apiError, error, pendiente, limpiar } = useGuardarDestino();
  const idGrupo = useId();

  /**
   * Firma de los valores iniciales.
   *
   * El efecto de recarga se engancha a esta cadena y **no** al objeto, porque
   * el padre puede reconstruir `valoresIniciales` en cada render (por ejemplo
   * `valoresDesdeDestino(destino)` sin memoizar). Depender del objeto
   * reiniciaría el formulario mientras el usuario escribe, borrando lo que
   * acaba de teclear. Con la firma, el reset solo ocurre cuando los datos de
   * origen cambian de verdad.
   */
  const firmaInicial = JSON.stringify(valoresIniciales);

  useEffect(() => {
    setValores(JSON.parse(firmaInicial) as DestinoFormValues);
    setErroresLocales({});
    setTocados(false);
  }, [firmaInicial]);

  function actualizar<K extends keyof DestinoFormValues>(
    campo: K,
    valor: DestinoFormValues[K],
  ) {
    setValores((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function alEditar(campo: CampoEditable, valor: string) {
    actualizar(campo, valor);

    // Escribir esconde el error anterior: si el campo acaba de ser corregido,
    // el mensaje viejo ya no describe lo que hay en pantalla.
    if (apiError) {
      limpiar();
    }
  }

  // El backend es la autoridad: sus mensajes reemplazan a los locales, pero
  // solo para los campos que señala, para no pisar el resto.
  function erroresDe(campo: CampoFormularioDestino): string[] {
    return apiError?.mensajesDe(campo) ?? erroresLocales[campo] ?? [];
  }

  function campoInvalido(campo: CampoFormularioDestino): boolean {
    return erroresDe(campo).length > 0;
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setTocados(true);

    const locales = validarFormulario(valores);

    setErroresLocales(locales);

    if (!esFormularioValido(valores)) {
      return;
    }

    // `idDestino` decide el método: con id es PATCH, sin id es POST.
    const guardado = await guardar(aPayload(valores), idDestino);

    if (guardado) {
      setTocados(false);
      alGuardar();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7">
      {/* =========================================================
          DATOS PRINCIPALES
      ========================================================== */}
      <fieldset
        disabled={pendiente || pendienteCarga}
        className="space-y-7 disabled:opacity-70"
      >
        <legend className="sr-only">
          {editando ? "Editar destino" : "Nuevo destino"}
        </legend>

        <CampoTexto
          id={`${idGrupo}-nombre`}
          etiqueta="Nombre del destino"
          obligatorio
          contador={`${valores.nombre.length} / ${NOMBRE_MAX}`}
          error={campoInvalido("nombre") ? erroresDe("nombre") : undefined}
          pista="Cómo lo verá el turista en la card del catálogo."
        >
          <input
            id={`${idGrupo}-nombre`}
            name="nombre"
            type="text"
            value={valores.nombre}
            maxLength={NOMBRE_MAX}
            onChange={(evento) => alEditar("nombre", evento.target.value)}
            aria-invalid={campoInvalido("nombre")}
            aria-describedby={
              campoInvalido("nombre")
                ? idErrorDe(`${idGrupo}-nombre`)
                : idPistaDe(`${idGrupo}-nombre`)
            }
            className={claseInput(campoInvalido("nombre"))}
          />
        </CampoTexto>

        <CampoTexto
          id={`${idGrupo}-descripcion`}
          etiqueta="Descripción"
          obligatorio
          error={campoInvalido("descripcion") ? erroresDe("descripcion") : undefined}
          pista="Incluí el contexto histórico y cultural: es el texto que se muestra al abrir el destino."
        >
          <textarea
            id={`${idGrupo}-descripcion`}
            name="descripcion"
            rows={5}
            value={valores.descripcion}
            onChange={(evento) => alEditar("descripcion", evento.target.value)}
            aria-invalid={campoInvalido("descripcion")}
            aria-describedby={
              campoInvalido("descripcion")
                ? idErrorDe(`${idGrupo}-descripcion`)
                : idPistaDe(`${idGrupo}-descripcion`)
            }
            className={`${claseInput(campoInvalido("descripcion"))} resize-y leading-6`}
          />
        </CampoTexto>

        <div className="grid gap-7 sm:grid-cols-2">
          <CampoTexto
            id={`${idGrupo}-direccion`}
            etiqueta="Dirección"
            contador={`${valores.direccion.length} / ${DIRECCION_MAX}`}
            error={campoInvalido("direccion") ? erroresDe("direccion") : undefined}
            pista="Opcional. Referencia para llegar al lugar."
          >
            <input
              id={`${idGrupo}-direccion`}
              name="direccion"
              type="text"
              value={valores.direccion}
              maxLength={DIRECCION_MAX}
              onChange={(evento) => alEditar("direccion", evento.target.value)}
              aria-invalid={campoInvalido("direccion")}
              aria-describedby={
                campoInvalido("direccion")
                  ? idErrorDe(`${idGrupo}-direccion`)
                  : idPistaDe(`${idGrupo}-direccion`)
              }
              className={claseInput(campoInvalido("direccion"))}
            />
          </CampoTexto>

          <CampoTexto
            id={`${idGrupo}-duracion`}
            etiqueta="Duración de la visita (minutos)"
            error={
              campoInvalido("duracionMinutos")
                ? erroresDe("duracionMinutos")
                : undefined
            }
            pista="Opcional. Dejalo vacío si no la conocés: el sistema no admite 0."
          >
            <input
              id={`${idGrupo}-duracion`}
              name="duracionMinutos"
              type="number"
              inputMode="numeric"
              min={1}
              step={5}
              value={valores.duracionMinutos}
              onChange={(evento) => alEditar("duracionMinutos", evento.target.value)}
              aria-invalid={campoInvalido("duracionMinutos")}
              aria-describedby={
                campoInvalido("duracionMinutos")
                  ? idErrorDe(`${idGrupo}-duracion`)
                  : idPistaDe(`${idGrupo}-duracion`)
              }
              className={claseInput(campoInvalido("duracionMinutos"))}
            />
          </CampoTexto>
        </div>

        {/* =========================================================
            COORDENADAS
        ========================================================== */}
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]">
            Ubicación
            <span className="ml-1 text-[#9A5B3C]" aria-hidden="true">
              *
            </span>
          </p>

          <div className="mt-2.5 grid gap-7 sm:grid-cols-2">
            <CampoTexto
              id={`${idGrupo}-longitud`}
              etiqueta="Longitud"
              obligatorio
              error={campoInvalido("longitud") ? erroresDe("longitud") : undefined}
              pista="Entre -180 y 180. En La Paz rondan los -68,1."
            >
              <input
                id={`${idGrupo}-longitud`}
                name="longitud"
                type="text"
                inputMode="decimal"
                value={valores.longitud}
                onChange={(evento) => alEditar("longitud", evento.target.value)}
                aria-invalid={campoInvalido("longitud")}
                aria-describedby={
                  campoInvalido("longitud")
                    ? idErrorDe(`${idGrupo}-longitud`)
                    : idPistaDe(`${idGrupo}-longitud`)
                }
                className={claseInput(campoInvalido("longitud"))}
              />
            </CampoTexto>

            <CampoTexto
              id={`${idGrupo}-latitud`}
              etiqueta="Latitud"
              obligatorio
              error={campoInvalido("latitud") ? erroresDe("latitud") : undefined}
              pista="Entre -90 y 90. En La Paz rondan los -16,5."
            >
              <input
                id={`${idGrupo}-latitud`}
                name="latitud"
                type="text"
                inputMode="decimal"
                value={valores.latitud}
                onChange={(evento) => alEditar("latitud", evento.target.value)}
                aria-invalid={campoInvalido("latitud")}
                aria-describedby={
                  campoInvalido("latitud")
                    ? idErrorDe(`${idGrupo}-latitud`)
                    : idPistaDe(`${idGrupo}-latitud`)
                }
                className={claseInput(campoInvalido("latitud"))}
              />
            </CampoTexto>
          </div>
        </div>

        {/* =========================================================
            CATEGORÍAS
        ========================================================== */}
        <fieldset>
          <legend className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8D4F32]">
            Categorías
          </legend>

          {categorias.length === 0 ? (
            // Mientras se cargan, el formulario entero está deshabilitado por
            // `pendienteCarga`, así que el mensaje solo aparece cuando ya se
            // sabe que de verdad no hay ninguna. Antes se mostraba también
            // durante la carga, diciendo que no había categorías cuando
            // todavía no se había preguntado.
            pendienteCarga ? null : (
              <p className="mt-2.5 text-xs text-[#746D63]">
                No hay categorías activas para asignar. El destino se publicará
                igual, pero sin aparecer en los filtros del catálogo.
              </p>
            )
          ) : (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {categorias.map((categoria) => {
                const marcada = valores.categorias.includes(categoria.id_categoria);
                const id = `${idGrupo}-cat-${categoria.id_categoria}`;

                return (
                  <label
                    key={categoria.id_categoria}
                    htmlFor={id}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-black transition ${
                      marcada
                        ? "border-[#2F4B3B] bg-[#2F4B3B] text-[#FFFDF8]"
                        : "border-[#5B3A29]/15 bg-[#F3EBDD]/60 text-[#514B43] hover:border-[#2F4B3B]/40"
                    }`}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      className="sr-only"
                      checked={marcada}
                      onChange={() =>
                        actualizar(
                          "categorias",
                          alternarCategoria(
                            valores.categorias,
                            categoria.id_categoria,
                          ),
                        )
                      }
                    />
                    {categoria.nombre}
                  </label>
                );
              })}
            </div>
          )}

          {campoInvalido("categorias") && (
            <ul
              id={idErrorDe(`${idGrupo}-categorias`)}
              className="mt-2 space-y-1 text-xs font-semibold text-[#9A3B2E]"
            >
              {erroresDe("categorias").map((mensaje) => (
                <li key={mensaje}>{mensaje}</li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="grid gap-7 sm:grid-cols-2">
          <CampoTexto
            id={`${idGrupo}-fuente`}
            etiqueta="Fuente del dato"
            contador={`${valores.fuenteOrigen.length} / ${FUENTE_ORIGEN_MAX}`}
            error={campoInvalido("fuenteOrigen") ? erroresDe("fuenteOrigen") : undefined}
            pista="Opcional. Ejemplos: INSTITUCIONAL, SCRAPING."
          >
            <input
              id={`${idGrupo}-fuente`}
              name="fuenteOrigen"
              type="text"
              value={valores.fuenteOrigen}
              maxLength={FUENTE_ORIGEN_MAX}
              onChange={(evento) => alEditar("fuenteOrigen", evento.target.value)}
              aria-invalid={campoInvalido("fuenteOrigen")}
              aria-describedby={
                campoInvalido("fuenteOrigen")
                  ? idErrorDe(`${idGrupo}-fuente`)
                  : idPistaDe(`${idGrupo}-fuente`)
              }
              className={claseInput(campoInvalido("fuenteOrigen"))}
            />
          </CampoTexto>

          <div className="flex items-end">
            <label
              htmlFor={`${idGrupo}-activo`}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#5B3A29]/15 bg-[#F3EBDD]/60 px-4 py-3.5"
            >
              <input
                id={`${idGrupo}-activo`}
                name="activo"
                type="checkbox"
                checked={valores.activo}
                onChange={(evento) => actualizar("activo", evento.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#2F4B3B]"
              />

              <span>
                <span className="block text-xs font-black text-[#263029]">
                  Visible en el catálogo
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#746D63]">
                  Si lo desmarcás, el destino se da de baja y desaparece del
                  catálogo público, pero acá queda siempre.
                </span>
              </span>
            </label>
          </div>
        </div>
      </fieldset>

      {/* =========================================================
          ERRORES Y ACCIONES
      ========================================================== */}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-[#9A3B2E]/25 bg-[#9A3B2E]/[0.07] px-4 py-3 text-sm font-semibold text-[#9A3B2E]"
        >
          {error}
        </p>
      )}

      {tocados && Object.keys(erroresLocales).length > 0 && (
        <p role="status" className="text-xs font-semibold text-[#8D4F32]">
          Revisá los campos marcados antes de guardar.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-[#5B3A29]/[0.08] pt-6">
        <button
          type="submit"
          disabled={pendiente || pendienteCarga}
          className="inline-flex items-center gap-2.5 rounded-full bg-[#2F4B3B] px-6 py-3 text-sm font-black text-[#FFFDF8] transition hover:bg-[#233128] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pendiente
            ? "Guardando…"
            : editando
              ? "Guardar cambios"
              : "Crear destino"}
        </button>

        <button
          type="button"
          onClick={() => {
            setValores(valoresIniciales);
            setErroresLocales({});
            setTocados(false);

            if (apiError) {
              limpiar();
            }
          }}
          disabled={pendiente}
          className="rounded-full border border-[#2F4B3B]/25 px-6 py-3 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Descartar cambios
        </button>
      </div>
    </form>
  );
}