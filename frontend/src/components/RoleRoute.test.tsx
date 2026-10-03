import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthProvider } from "../features/auth/context/AuthContext";
import { RoleRoute } from "./RoleRoute";

function sesion(roles: string[] = []) {
  localStorage.setItem("turismo_access_token", "access-test");
  localStorage.setItem("turismo_refresh_token", "refresh-test");
  localStorage.setItem(
    "turismo_auth_user",
    JSON.stringify({ nombre: "Jordan", email: "jordan@example.com", roles }),
  );
}

function renderConRoles(roles: string[]) {
  sesion(roles);

  return render(
    <MemoryRouter>
      <AuthProvider>
        <RoleRoute permitidos={["ADMIN"]}>
          <p>Contenido de administración</p>
        </RoleRoute>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("RoleRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deja pasar a la sesión con rol ADMIN", () => {
    renderConRoles(["ADMIN"]);

    expect(screen.getByText("Contenido de administración")).toBeInTheDocument();
  });

  it("bloquea a un turista y explica por qué, sin bucle de redirección", () => {
    renderConRoles(["TOURIST"]);

    expect(
      screen.queryByText("Contenido de administración"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /esta sección es solo para administradores/i,
      }),
    ).toBeInTheDocument();

    // Salidas visibles para que el usuario no quede atrapado.
    expect(
      screen.getByRole("link", { name: /ir al catálogo/i }),
    ).toHaveAttribute("href", "/destinos");

    expect(
      screen.getByRole("link", { name: /volver a mi perfil/i }),
    ).toHaveAttribute("href", "/mi-cuenta");
  });

  it("bloquea cuando el rol guardado es desconocido", () => {
    // Rol inventado en localStorage: no debe abrir la sección restringida.
    renderConRoles(["SUPERADMIN", "ADMINISTRADOR"]);

    expect(
      screen.queryByText("Contenido de administración"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /esta sección es solo para administradores/i,
      }),
    ).toBeInTheDocument();
  });

  it("bloquea cuando la sesión no tiene ningún rol", () => {
    renderConRoles([]);

    expect(
      screen.queryByText("Contenido de administración"),
    ).not.toBeInTheDocument();
  });
});
