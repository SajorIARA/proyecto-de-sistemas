
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/context/AuthContext";
import { authApi } from "../../auth/api/authApi";
import { cuentaApi, CuentaApiError } from "../api/cuentaApi";
import { PerfilPage } from "./PerfilPage";

// ============================================================
// MOCKS DE LAS APIS
// ============================================================

vi.mock("../../auth/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("../api/cuentaApi", async () => {
  const real = await vi.importActual<typeof import("../api/cuentaApi")>(
    "../api/cuentaApi",
  );

  return {
    ...real,
    cuentaApi: {
      ...real.cuentaApi,
      cambiarPassword: vi.fn(),
      listarUsuarios: vi.fn(),
    },
  };
});

// ============================================================
// CONFIGURACIÓN DE PRUEBAS
// ============================================================

function cliente() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        retryDelay: 0,
      },
    },
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

            <Route
              path="/"
              element={<h1>Página principal</h1>}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ============================================================
// PRUEBAS DEL PERFIL
// ============================================================

describe("PerfilPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ----------------------------------------------------------
  // TEST 1: DATOS DEL USUARIO
  // ----------------------------------------------------------

  it("muestra los datos reales del usuario en sesión", () => {
    sesion();

    renderPerfil();

    expect(
      screen.getByRole("heading", {
        name: /hola, jordan arispe/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("jordan@example.com").length,
    ).toBeGreaterThan(0);

    expect(
      screen.queryByText(/listo para conectarse con django/i),
    ).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // TEST 2: PERMISOS DEL ADMINISTRADOR
  // ----------------------------------------------------------

  it("etiqueta el rol del usuario y ofrece el panel solo a ADMIN", () => {
    sesion(["ADMIN"]);

    renderPerfil();

    expect(
      screen.getAllByText("Administrador").length,
    ).toBeGreaterThan(0);

    expect(
      screen.getByRole("link", {
        name: /panel de usuarios/i,
      }),
    ).toHaveAttribute("href", "/mi-cuenta/usuarios");
  });

  // ----------------------------------------------------------
  // TEST 3: PERMISOS DEL TURISTA
  // ----------------------------------------------------------

  it("no muestra el panel de usuarios a un turista", () => {
    sesion(["TOURIST"]);

    renderPerfil();

    expect(
      screen.getAllByText("Turista").length,
    ).toBeGreaterThan(0);

    expect(
      screen.queryByRole("link", {
        name: /panel de usuarios/i,
      }),
    ).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // TEST 4: CAMBIO DE CONTRASEÑA EXITOSO
  // ----------------------------------------------------------

  it("envía el cambio de contraseña y confirma con un mensaje", async () => {
    sesion();

    vi.mocked(cuentaApi.cambiarPassword).mockResolvedValue(undefined);

    renderPerfil();

    // Primero abrimos el modal.
    fireEvent.click(
      screen.getByRole("button", {
        name: /cambiar contraseña/i,
      }),
    );

    // Verificamos que el modal esté visible.
    expect(
      screen.getByRole("dialog", {
        name: /cambiar contraseña/i,
      }),
    ).toBeInTheDocument();

    // Completamos los tres campos.
    fireEvent.change(
      screen.getByLabelText(/contraseña actual/i),
      {
        target: { value: "vieja12345" },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^nueva contraseña$/i),
      {
        target: { value: "Nueva12345!" },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/repetir nueva contraseña/i),
      {
        target: { value: "Nueva12345!" },
      },
    );

    // Enviamos el formulario.
    fireEvent.click(
      screen.getByRole("button", {
        name: /actualizar contraseña/i,
      }),
    );

    // Comprobamos el mensaje de confirmación.
    expect(
      await screen.findByText(/contraseña actualizada/i),
    ).toBeInTheDocument();

    // Verificamos los datos enviados a la API.
    expect(cuentaApi.cambiarPassword).toHaveBeenCalledWith({
      current_password: "vieja12345",
      new_password: "Nueva12345!",
      new_password_confirm: "Nueva12345!",
    });
  });

  // ----------------------------------------------------------
  // TEST 5: ERROR DEL BACKEND
  // ----------------------------------------------------------

  it("muestra bajo el campo el error que devuelve el backend", async () => {
    sesion();

    vi.mocked(cuentaApi.cambiarPassword).mockRejectedValue(
      new CuentaApiError(
        "La contraseña actual es incorrecta.",
        400,
        {
          current_password: [
            "La contraseña actual es incorrecta.",
          ],
        },
      ),
    );

    renderPerfil();

    // Abrimos el modal antes de buscar los campos.
    fireEvent.click(
      screen.getByRole("button", {
        name: /cambiar contraseña/i,
      }),
    );

    expect(
      screen.getByRole("dialog", {
        name: /cambiar contraseña/i,
      }),
    ).toBeInTheDocument();

    // Simulamos una contraseña actual incorrecta.
    fireEvent.change(
      screen.getByLabelText(/contraseña actual/i),
      {
        target: { value: "mala" },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^nueva contraseña$/i),
      {
        target: { value: "Nueva12345!" },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/repetir nueva contraseña/i),
      {
        target: { value: "Nueva12345!" },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /actualizar contraseña/i,
      }),
    );

    // Comprobamos el error devuelto por Django.
    const aviso = await screen.findAllByText(
      /la contraseña actual es incorrecta/i,
    );

    expect(aviso.length).toBeGreaterThan(0);

    // El campo debe marcarse como inválido.
    expect(
      screen.getByLabelText(/contraseña actual/i),
    ).toHaveAttribute("aria-invalid", "true");
  });

  // ----------------------------------------------------------
  // TEST 6: ABRIR Y CERRAR EL MODAL
  // ----------------------------------------------------------

  it("abre y cierra correctamente el modal de contraseña", () => {
    sesion(["ADMIN"]);

    renderPerfil();

    // Inicialmente el modal está cerrado.
    expect(
      screen.queryByRole("dialog", {
        name: /cambiar contraseña/i,
      }),
    ).not.toBeInTheDocument();

    // Abrimos la ventana.
    fireEvent.click(
      screen.getByRole("button", {
        name: /cambiar contraseña/i,
      }),
    );

    // El modal debe mostrarse.
    expect(
      screen.getByRole("dialog", {
        name: /cambiar contraseña/i,
      }),
    ).toBeInTheDocument();

    // Verificamos que exista el formulario.
    expect(
      screen.getByLabelText(/contraseña actual/i),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^nueva contraseña$/i),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/repetir nueva contraseña/i),
    ).toBeInTheDocument();

    // Cerramos la ventana con la X.
    fireEvent.click(
      screen.getByRole("button", {
        name: /cerrar ventana/i,
      }),
    );

    // Comprobamos que desaparezca.
    expect(
      screen.queryByRole("dialog", {
        name: /cambiar contraseña/i,
      }),
    ).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // TEST 7: CERRAR SESIÓN
  // ----------------------------------------------------------

  it("cierra sesión, borra los tokens y vuelve al inicio", async () => {
    sesion();

    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    renderPerfil();

    fireEvent.click(
      screen.getByRole("button", {
        name: /cerrar sesión/i,
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /página principal/i,
        }),
      ).toBeInTheDocument();
    });

    expect(authApi.logout).toHaveBeenCalledWith("refresh-test");

    expect(
      localStorage.getItem("turismo_access_token"),
    ).toBeNull();

    expect(
      localStorage.getItem("turismo_refresh_token"),
    ).toBeNull();

    expect(
      localStorage.getItem("turismo_auth_user"),
    ).toBeNull();
  });
});
