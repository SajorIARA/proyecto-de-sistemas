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

import { ButtonLink } from "../../../../design-system/components/Button";
import { PrivateShell } from "../../../cuenta/components/PrivateShell";
import { DestinosAdminTabla } from "../components/DestinosAdminTabla";

export function AdminDestinosPage() {
  return (
    <PrivateShell
      eyebrow="Administración"
      titulo="Destinos turísticos"
      descripcion="Alta, edición y baja de los destinos del catálogo. Un destino dado de baja deja de aparecer en el catálogo público, pero acá queda siempre y se puede reactivar."
    >
      <div className="mb-6">
        <ButtonLink
          to="/mi-cuenta/destinos/nuevo"
          variante="primary"
        >
          <span aria-hidden="true">+</span>
          Nuevo destino
        </ButtonLink>
      </div>

      <DestinosAdminTabla />
    </PrivateShell>
  );
}
