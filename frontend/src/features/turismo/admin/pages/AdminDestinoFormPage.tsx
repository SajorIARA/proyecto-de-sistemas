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
 * Tras guardar vuelve al listado con `replace: true`, así el botón "atrás"
 * del navegador no lleva al formulario de un destino que ya no existe en
 * pantalla.
 */

import { Link, useNavigate, useParams } from "react-router-dom";
import { PrivateShell } from "../../../cuenta/components/PrivateShell";
import { DestinoForm } from "../components/DestinoForm";
import { useCategorias } from "../../hooks/useTurismo";
import { useDestinoAdmin } from "../hooks/useDestinosAdmin";
import { VALORES_INICIALES, valoresDesdeDestino } from "../utils/destinoForm";

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

  function alGuardar() {
    navigate("/mi-cuenta/destinos", { replace: true });
  }

  const errorCarga =
    isError && error instanceof Error
      ? error.message
      : "No pudimos cargar el destino que querés editar.";

  return (
    <PrivateShell
      eyebrow="Administración · Destinos"
      titulo={editando ? "Editar destino" : "Nuevo destino"}
      descripcion={
        editando
          ? "Modificá los datos del destino. Los cambios se reflejan en el catálogo público en cuanto guardás."
          : "Cargá un destino nuevo al catálogo. Aparece en el catálogo público apenas lo guardás con la visibilidad activa."
      }
    >
      <div className="mb-6">
        <Link
          to="/mi-cuenta/destinos"
          className="inline-flex items-center gap-2 text-xs font-black text-[#2F4B3B] underline-offset-4 transition hover:underline"
        >
          <span aria-hidden="true">←</span> Volver al listado
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] shadow-[0_20px_60px_rgba(72,55,38,0.08)]">
        <div className="flex items-center gap-3 border-b border-[#5B3A29]/[0.08] px-6 py-5 sm:px-8">
          <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />

          <h2 className="text-lg font-black tracking-tight text-[#233128]">
            {editando ? "Datos del destino" : "Datos del destino nuevo"}
          </h2>
        </div>

        <div className="px-6 py-7 sm:px-8">
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
                  className="h-12 animate-pulse rounded-2xl bg-[#5B3A29]/[0.07]"
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
                className="mt-5 inline-block rounded-full border border-[#2F4B3B]/25 px-6 py-2.5 text-sm font-black text-[#2F4B3B] transition hover:border-[#2F4B3B]"
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
    </PrivateShell>
  );
}