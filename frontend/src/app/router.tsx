import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleRoute } from "../components/RoleRoute";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { AdminUsuariosPage } from "../features/cuenta/pages/AdminUsuariosPage";
import { PerfilPage } from "../features/cuenta/pages/PerfilPage";
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
    element: <HomePage />,
  },
  {
    path: "/destinos",
    element: <CatalogoPage />,
  },
  {
    path: "/destinos/:id",
    element: <DestinoDetailPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/registro",
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/mi-cuenta",
        element: <PerfilPage />,
      },
      {
        // Panel de administración: exige rol ADMIN.
        path: "/mi-cuenta/usuarios",
        element: soloAdmin(<AdminUsuariosPage />),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
