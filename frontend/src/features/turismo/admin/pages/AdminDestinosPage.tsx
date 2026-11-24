/**
 * Panel de administración de destinos — ruta `/mi-cuenta/destinos`.
 *
 * Solo ADMIN. La protección es de tres capas, igual que en el panel de
 * usuarios: `RoleRoute` bloquea el render, `useDestinosAdmin` lleva
 * `enabled: esAdmin` para que la petición no salga, y el propio backend
 * responde 403 (`AtractivoAdminViewSet` usa `IsAdmin`).
 *
 * A diferencia del panel de usuarios, aquí **sí** hay acciones: el backend
 * expone un `ModelViewSet` completo para destinos.
 */

import { Link } from "react-router-dom";
import { PrivateShell } from "../../../cuenta/components/PrivateShell";
import { DestinosAdminTabla } from "../components/DestinosAdminTabla";

export function AdminDestinosPage() {
  return (
    <PrivateShell
      eyebrow="Administración"
      titulo="Destinos turísticos"
      descripcion="Alta, edición y baja de los destinos del catálogo. Un destino dado de baja deja de aparecer en el catálogo público, pero acá queda siempre y se puede reactivar."
    >
      <div className="mb-6 flex flex-col gap-4 border border-[#5B3A29]/15 bg-[#FFFDF8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9A5B3C]">
            Mesa de trabajo
          </p>

          <p className="mt-1 max-w-xl text-xs leading-6 text-[#746D63]">
            Cada alta se publica con sus fotos, horarios y tarifas. Revisá la
            ficha pública antes de darla por terminada.
          </p>
        </div>

        <Link
          to="/mi-cuenta/destinos/nuevo"
          className="group inline-flex shrink-0 items-center justify-between gap-4 bg-[#233128] px-5 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8] transition hover:bg-[#2F4B3B]"
        >
          <span aria-hidden="true" className="text-sm leading-none">
            +
          </span>
          Nuevo destino
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
          >
            →
          </span>
        </Link>
      </div>

      <DestinosAdminTabla />
    </PrivateShell>
  );
}
