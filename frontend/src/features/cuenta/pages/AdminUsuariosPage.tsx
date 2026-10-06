/**
 * Panel de administración de usuarios — ruta `/mi-cuenta/usuarios`.
 *
 * Accesible únicamente con rol ADMIN. La protección es de tres capas:
 *
 *  1. `RoleRoute` en el router bloquea el render para quien no sea ADMIN.
 *  2. `useUsuariosAdmin` tiene `enabled: esAdmin`, así que la petición no
 *     se lanza aunque el componente llegara a montarse.
 *  3. El propio backend responde 403 a un rol no ADMIN (verificado en
 *     vivo), de modo que ningún dato puede filtrarse aunque el frontend se
 *     equivoque.
 *
 * El listado es de solo lectura porque `UsuariosAdminView` solo expone GET:
 * el backend no tiene rutas para crear, editar ni desactivar usuarios.
 */

import { PrivateShell } from "../components/PrivateShell";
import { UsuariosTabla } from "../components/UsuariosTabla";

export function AdminUsuariosPage() {
  return (
    <PrivateShell
      eyebrow="Administración"
      titulo="Usuarios de la plataforma"
      descripcion="Cuentas registradas en Turismo La Paz, con su rol y su estado. La información es de solo lectura."
    >
      <UsuariosTabla />
    </PrivateShell>
  );
}
