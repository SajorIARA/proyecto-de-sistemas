import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/context/AuthContext";
import { authApi } from "../../auth/api/authApi";
import { cuentaApi, CuentaApiError } from "../api/cuentaApi";
import { PerfilPage } from "./PerfilPage";

vi.mock("../../auth/api/authApi", () => ({
  authApi: { login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

vi.mock("../api/cuentaApi", async () => {
  const real = await vi.importActual<typeof import("../api/cuentaApi")>(
    "../api/cuentaApi",
  );

  return {
    ...real,
    // `cuentaApi` es un objeto: hay que sustituir sus métodos DENTRO del
    // objeto. Sobrescribir `cambiarPassword` en el nivel superior no tendría
    // efecto sobre `cuentaApi.cambiarPassword`.
    cuentaApi: {
      ...real.cuentaApi,
      cambiarPassword: vi.fn(),
      listarUsuarios: vi.fn(),
    },
  };
});

function cliente() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, retryDelay: 0 } },
  });
}

function sesion(roles: string[] = ["TOURIST"]) {
  localStorage.setItem("turismo_access_token", "access-test");
  localStorage.setItem("turismo_refresh_token", "refresh-test");
  localStorage.setItem(
    "turismo_auth_user",
    JSON.stringify({
      nombre: "Jordan Arispe",
      email: "jordan@example.com",
      roles,
    }),
  );
}

function renderPerfil() {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={["/mi-cuenta"]}>
        <AuthProvider>
          <Routes>
            <Route path="/mi-cuenta" element={<PerfilPage />} />
            <Route
              path="/mi-cuenta/usuarios"
              element={<h1>Panel de usuarios</h1>}
            />
            <Route path="/" element={<h1>Página principal</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PerfilPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("muestra los datos reales del usuario en sesión", () => {
    sesion();

    renderPerfil();

    expect(
      screen.getByRole("heading", { name: /hola, jordan arispe/i }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("jordan@example.com").length).toBeGreaterThan(0);

    // El placeholder decía "listo para conectarse con Django": ya no debe
    // aparecer ese texto.
    expect(
      screen.queryByText(/listo para conectarse con django/i),
    ).not.toBeInTheDocument();
  });

  it("etiqueta el rol del usuario y ofrece el panel solo a ADMIN", () => {
    sesion(["ADMIN"]);

    renderPerfil();

    expect(screen.getAllByText("Administrador").length).toBeGreaterThan(0);

    expect(
      screen.getByRole("link", { name: /panel de usuarios/i }),
    ).toHaveAttribute("href", "/mi-cuenta/usuarios");
  });

  it("no muestra el panel de usuarios a un turista", () => {
    sesion(["TOURIST"]);

    renderPerfil();

    expect(screen.getAllByText("Turista").length).toBeGreaterThan(0);

    expect(
      screen.queryByRole("link", { name: /panel de usuarios/i }),
    ).not.toBeInTheDocument();
  });

  it("envía el cambio de contraseña y confirma con un mensaje", async () => {
    sesion();
    vi.mocked(cuentaApi.cambiarPassword).mockResolvedValue(undefined);

    renderPerfil();

    fireEvent.change(screen.getByLabelText(/contraseña actual/i), {
      target: { value: "vieja12345" },
    });
    fireEvent.change(screen.getByLabelText(/^nueva contraseña$/i), {
      target: { value: "Nueva12345!" },
    });
    fireEvent.change(screen.getByLabelText(/repetir nueva contraseña/i), {
      target: { value: "Nueva12345!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /actualizar contraseña/i }),
    );

    expect(
      await screen.findByText(/contraseña actualizada/i),
    ).toBeInTheDocument();

    expect(cuentaApi.cambiarPassword).toHaveBeenCalledWith({
      current_password: "vieja12345",
      new_password: "Nueva12345!",
      new_password_confirm: "Nueva12345!",
    });
  });

  it("muestra bajo el campo el error que devuelve el backend", async () => {
    sesion();
    vi.mocked(cuentaApi.cambiarPassword).mockRejectedValue(
      new CuentaApiError("La contraseña actual es incorrecta.", 400, {
        current_password: ["La contraseña actual es incorrecta."],
      }),
    );

    renderPerfil();

    fireEvent.change(screen.getByLabelText(/contraseña actual/i), {
      target: { value: "mala" },
    });
    fireEvent.change(screen.getByLabelText(/^nueva contraseña$/i), {
      target: { value: "Nueva12345!" },
    });
    fireEvent.change(screen.getByLabelText(/repetir nueva contraseña/i), {
      target: { value: "Nueva12345!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /actualizar contraseña/i }),
    );

    const aviso = await screen.findAllByText(
      /la contraseña actual es incorrecta/i,
    );

    expect(aviso.length).toBeGreaterThan(0);

    // El input queda marcado como inválido para lectores de pantalla.
    expect(screen.getByLabelText(/contraseña actual/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("cierra sesión, borra los tokens y vuelve al inicio", async () => {
    sesion();
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    renderPerfil();

    fireEvent.click(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /página principal/i }),
      ).toBeInTheDocument();
    });

    expect(authApi.logout).toHaveBeenCalledWith("refresh-test");
    expect(localStorage.getItem("turismo_access_token")).toBeNull();
    expect(localStorage.getItem("turismo_refresh_token")).toBeNull();
    expect(localStorage.getItem("turismo_auth_user")).toBeNull();
  });
});
