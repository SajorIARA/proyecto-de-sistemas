import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./features/auth/context/AuthContext";
import { HomePage } from "./pages/HomePage";

function renderHome() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>
        <AuthProvider>
          <HomePage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * La portada monta el hero con cuatro diapositivas, seis categorías, seis
 * zonas, la franja gastronómica, los datos útiles y el pie. En jsdom eso
 * tarda más que el límite por defecto de 5 s cuando la suite completa
 * corre en paralelo, así que cada prueba declara su propio margen.
 */
const TIMEOUT_PORTADA_MS = 20_000;

describe("HomePage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("muestra la página principal de Turismo La Paz", () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        name: /Qué puedes vivir hoy en La Paz/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /La Paz.*en movimiento.*inicio/i }),
    ).toBeInTheDocument();
  }, TIMEOUT_PORTADA_MS);

  it("muestra las opciones de autenticación cuando no existe sesión", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /Iniciar sesión/i }),
    ).toHaveAttribute("href", "/login");

    expect(
      screen.getByRole("link", { name: /Planificar mi viaje/i }),
    ).toHaveAttribute("href", "/destinos?vista=armar");
  }, TIMEOUT_PORTADA_MS);

  it("mantiene una sola acción principal para armar ruta en la portada", () => {
    renderHome();

    const enlace = screen.getByRole("link", { name: /Planificar mi viaje/i });

    expect(enlace).toHaveAttribute("href", "/destinos?vista=armar");
    expect(
      screen.queryByRole("link", { name: /Planificar desde cero/i }),
    ).not.toBeInTheDocument();
  }, TIMEOUT_PORTADA_MS);

  it("muestra las categorías principales de turismo", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "Naturaleza de altura" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Cultura viva" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Sabores locales" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Miradores" }),
    ).toBeInTheDocument();

  }, TIMEOUT_PORTADA_MS);

  it("enlaza experiencias, zonas y tiempos con parámetros utilizables", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /Naturaleza de altura/i }),
    ).toHaveAttribute("href", "/destinos?categoria=Naturaleza");
    expect(
      screen.getByRole("link", { name: /Mallasa.*Naturaleza/i }),
    ).toHaveAttribute("href", "/destinos?zona=Mallasa");
    expect(
      screen.getByRole("link", { name: /Tengo 2 horas/i }),
    ).toHaveAttribute("href", "/destinos?vista=armar&tiempo=2-horas");
  }, TIMEOUT_PORTADA_MS);

  it("muestra fotografías reales y un pie de navegación completo", () => {
    renderHome();

    expect(
      screen.getByRole("img", {
        name: /Fachada de la Basílica de San Francisco/i,
      }),
    ).toHaveAttribute("src", "/images/cat-cultura.jpg");
    expect(
      screen.getByRole("contentinfo", {
        name: /CHUKIYAPU/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Créditos fotográficos/i }),
    ).toHaveAttribute("href", "/images/CREDITOS.md");
  }, TIMEOUT_PORTADA_MS);
});
