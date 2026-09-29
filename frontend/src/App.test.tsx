import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./features/auth/context/AuthContext";
import { HomePage } from "./pages/HomePage";

function renderHome() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <HomePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("muestra la página principal de Turismo La Paz", () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        name: /La Paz,\s*más cerca de ti/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Turismo La Paz/i }),
    ).toBeInTheDocument();
  });

  it("muestra las opciones de autenticación cuando no existe sesión", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /Iniciar sesión/i }),
    ).toHaveAttribute("href", "/login");

    expect(
      screen.getByRole("link", { name: /Registrarme/i }),
    ).toHaveAttribute("href", "/registro");

    expect(
      screen.getByRole("link", { name: /Comenzar ahora/i }),
    ).toHaveAttribute("href", "/registro");
  });

  it("muestra las categorías principales de turismo", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "Naturaleza" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Cultura" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Gastronomía" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Ciudad" }),
    ).toBeInTheDocument();
  });
});