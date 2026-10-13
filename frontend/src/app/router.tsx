import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleRoute } from "../components/RoleRoute";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { AdminUsuariosPage } from "../features/cuenta/pages/AdminUsuariosPage";
import { PerfilPage } from "../features/cuenta/pages/PerfilPage";
import { AdminDestinoFormPage } from "../features/turismo/admin/pages/AdminDestinoFormPage";
import { AdminDestinosPage } from "../features/turismo/admin/pages/AdminDestinosPage";
import { CatalogoPage } from "../features/turismo/pages/CatalogoPage";
import { DestinoDetailPage } from "../features/turismo/pages/DestinoDetailPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";

/** Atajo para las rutas que exigen rol ADMIN. */
const soloAdmin = (elemento: ReactNode) => (
  <RoleRoute permitidos={["ADMIN"]}>{elemento}</RoleRoute>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "destinos",
        element: <CatalogoPage />,
      },
      {
        path: "destinos/:id",
        element: <DestinoDetailPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "registro",
        element: <RegisterPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            // Perfil: disponible para cualquier rol autenticado.
            path: "mi-cuenta",
            element: <PerfilPage />,
          },
          {
            // Panel de administración: exige rol ADMIN.
            path: "mi-cuenta/usuarios",
            element: soloAdmin(<AdminUsuariosPage />),
          },
          {
            // CRUD de destinos: listado, alta y edición. Solo ADMIN.
            path: "mi-cuenta/destinos",
            element: soloAdmin(<AdminDestinosPage />),
          },
          {
            // El formulario de alta y el de edición comparten componente.
            // El orden importa: "nuevo" es literal y debe declararse antes que
            // ":id", o React Router lo interpretaría como un id chamado "nuevo".
            path: "mi-cuenta/destinos/nuevo",
            element: soloAdmin(<AdminDestinoFormPage />),
          },
          {
            path: "mi-cuenta/destinos/:id/editar",
            element: soloAdmin(<AdminDestinoFormPage />),
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);