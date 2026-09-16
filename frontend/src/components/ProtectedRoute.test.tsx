import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthProvider } from "../features/auth/context/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/mi-cuenta"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<h1>Login requerido</h1>} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/mi-cuenta"
              element={<h1>Contenido privado</h1>}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirige al login si no existe access token", () => {
    renderProtectedRoute();

    expect(
      screen.getByRole("heading", { name: /login requerido/i }),
    ).toBeInTheDocument();
  });

  it("permite ingresar cuando existe access token", () => {
    localStorage.setItem("turismo_access_token", "access-test");

    renderProtectedRoute();

    expect(
      screen.getByRole("heading", { name: /contenido privado/i }),
    ).toBeInTheDocument();
  });
});