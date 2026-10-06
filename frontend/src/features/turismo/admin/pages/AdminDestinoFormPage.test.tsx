/**
 * Pruebas de la página del formulario de destinos.
 *
 * El foco está en el modo alta, donde la página tiene que sortear un detalle
 * de TanStack Query que ya rompió el formulario una vez: `useDestinoAdmin` va
 * con `enabled: false` cuando no hay id, y una query deshabilitada se queda en
 * `pending` para siempre. Si esa páginaLee `isPending` sin condicionar, el
 * formulario de alta queda bloqueado y no se puede crear nada.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../../auth/context/AuthContext";
import * as api from "../api/destinosAdminApi";
import * as turismo from "../../api/turismoApi";
import { AdminDestinoFormPage } from "./AdminDestinoFormPage";

vi.mock("../api/destinosAdminApi", async () => {
  const real = await vi.importActual<
    typeof import("../api/destinosAdminApi")
  >("../api/destinosAdminApi");

  return { ...real, obtenerDestino: vi.fn(), listarDestinos: vi.fn() };
});

vi.mock("../../api/turismoApi", async () => {
  const real = await vi.importActual<typeof import("../../api/turismoApi")>(
    "../../api/turismoApi",
  );

  return { ...real, listarCategorias: vi.fn() };
});

function cliente() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, retryDelay: 0 } },
  });
}

function sesion() {
  localStorage.setItem("turismo_access_token", "access-test");
  localStorage.setItem("turismo_refresh_token", "refresh-test");
  localStorage.setItem(
    "turismo_auth_user",
    JSON.stringify({
      nombre: "Admin Paz",
      email: "admin@example.com",
      roles: ["ADMIN"],
    }),
  );
}

function renderEn(ruta: string) {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/mi-cuenta/destinos/nuevo"
              element={<AdminDestinoFormPage />}
            />
            <Route
              path="/mi-cuenta/destinos/:id/editar"
              element={<AdminDestinoFormPage />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminDestinoFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sesion();

    vi.mocked(turismo.listarCategorias).mockResolvedValue([
      { id_categoria: 5, nombre: "Naturaleza", descripcion: null, activo: true },
    ]);
  });

  it("en alta habilita el formulario aunque la query del destino esté apagada", async () => {
    renderEn("/mi-cuenta/destinos/nuevo");

    const boton = await screen.findByRole("button", { name: /crear destino/i });

    // La regresión: con `enabled: false`, `isPending` de `useDestinoAdmin` es
    // `true` para siempre y el botón quedaba deshabilitado en el alta.
    await waitFor(() => expect(boton).not.toBeDisabled());

    // Y debe ofrecer las categorías, no el mensaje de "no hay categorías".
    expect(
      screen.queryByText(/no hay categorías activas/i),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Naturaleza")).toBeInTheDocument();
  });

  it("en alta no pide el detalle de ningún destino", async () => {
    renderEn("/mi-cuenta/destinos/nuevo");

    await screen.findByRole("button", { name: /crear destino/i });

    expect(api.obtenerDestino).not.toHaveBeenCalled();
  });

  it("en edición pide el destino y precarga el nombre", async () => {
    vi.mocked(api.obtenerDestino).mockResolvedValue({
      id_atractivo: "a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
      nombre: "Valle de la Luna",
      descripcion: "Formaciones de arcilla.",
      direccion: "Zona Sur",
      duracion_minutos: 120,
      ubicacion: { longitud: -68.1375, latitud: -16.4961 },
      area: null,
      categorias: [5],
      fuente_origen: "INSTITUCIONAL",
      activo: true,
      fecha_creacion: "2026-10-03T18:14:30Z",
      fecha_actualizacion: "2026-10-03T18:14:30Z",
    });

    renderEn("/mi-cuenta/destinos/a74e9ce4-9e17-4ce1-8a3e-415479ab6164/editar");

    expect(await screen.findByDisplayValue("Valle de la Luna")).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(api.obtenerDestino).toHaveBeenCalledWith(
      "a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
    );

    // El botón dice "guardar", no "crear".
    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeInTheDocument();
  });

  it("muestra el error si no se puede cargar el destino a editar", async () => {
    const { DestinosAdminApiError } = await import("../api/destinosAdminApi");

    vi.mocked(api.obtenerDestino).mockRejectedValue(
      new DestinosAdminApiError("No existe ese destino.", 404),
    );

    renderEn("/mi-cuenta/destinos/no-existe/editar");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No existe ese destino.",
    );

    // No debe caer en el formulario vacío: un 404 no es "crear uno nuevo".
    expect(
      screen.queryByRole("button", { name: /crear destino/i }),
    ).not.toBeInTheDocument();
  });
});