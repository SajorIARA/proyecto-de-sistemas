import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/context/AuthContext";
import { cuentaApi } from "../api/cuentaApi";
import { AdminUsuariosPage } from "./AdminUsuariosPage";
import type { UsuarioAdmin } from "../../../types/auth";
import type { Paginado } from "../../../types/turismo";

vi.mock("../api/cuentaApi", async () => {
  const real = await vi.importActual<typeof import("../api/cuentaApi")>(
    "../api/cuentaApi",
  );

  return {
    ...real,
    // `cuentaApi` es un objeto: hay que sustituir sus métodos DENTRO del
    // objeto. Sobrescribir `listarUsuarios` en el nivel superior no tendría
    // efecto sobre `cuentaApi.listarUsuarios`.
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

function sesion(roles: string[] = ["ADMIN"]) {
  localStorage.setItem("turismo_access_token", "access-test");
  localStorage.setItem("turismo_refresh_token", "refresh-test");
  localStorage.setItem(
    "turismo_auth_user",
    JSON.stringify({
      nombre: "Admin Paz",
      email: "admin@example.com",
      roles,
    }),
  );
}

function usuario(overrides: Partial<UsuarioAdmin> = {}): UsuarioAdmin {
  return {
    id_usuario: "70fc884f-8e76-4847-81cc-bc95c8ef2948",
    email: "turista@example.com",
    nombre: "Turista Demo",
    activo: true,
    fecha_creacion: "2026-02-14T10:30:00Z",
    roles: ["TOURIST"],
    ...overrides,
  };
}

function pagina(
  results: UsuarioAdmin[],
  extra: Partial<Paginado<UsuarioAdmin>> = {},
): Paginado<UsuarioAdmin> {
  return { count: results.length, next: null, previous: null, results, ...extra };
}

function renderAdmin() {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={["/mi-cuenta/usuarios"]}>
        <AuthProvider>
          <AdminUsuariosPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminUsuariosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sesion();
  });

  it("lista los usuarios que devuelve el backend", async () => {
    vi.mocked(cuentaApi.listarUsuarios).mockResolvedValue(
      pagina([
        usuario(),
        usuario({
          id_usuario: "00000000-0000-0000-0000-000000000002",
          nombre: "Ana Rojas",
          email: "ana.rojas@example.com",
          roles: ["ADMIN"],
        }),
      ]),
    );

    renderAdmin();

    expect(await screen.findByText("Turista Demo")).toBeInTheDocument();
    expect(screen.getByText("Ana Rojas")).toBeInTheDocument();

    expect(screen.getByText("turista@example.com")).toBeInTheDocument();
    expect(screen.getByText("ana.rojas@example.com")).toBeInTheDocument();

    // 2 usuarios · el backend trae el id como `id_usuario`.
    expect(screen.getByText("2 usuarios")).toBeInTheDocument();
  });

  it("muestra el rol de cada usuario y su estado", async () => {
    vi.mocked(cuentaApi.listarUsuarios).mockResolvedValue(
      pagina([
        usuario({ nombre: "Turista Demo", roles: ["TOURIST"] }),
        usuario({
          id_usuario: "00000000-0000-0000-0000-000000000001",
          nombre: "Ana Rojas",
          email: "ana.rojas@example.com",
          activo: false,
          roles: ["ADMIN"],
        }),
      ]),
    );

    renderAdmin();

    await screen.findByText("Turista Demo");

    // Se consulta dentro de la tabla: el encabezado de la página también
    // muestra el badge del rol de quien está en sesión ("Administrador").
    const tabla = within(screen.getByRole("table"));

    expect(tabla.getByText("Administrador")).toBeInTheDocument();
    expect(tabla.getByText("Turista")).toBeInTheDocument();

    expect(tabla.getByText("Activo")).toBeInTheDocument();
    expect(tabla.getByText("Inactivo")).toBeInTheDocument();
  });

  it("no lanza la petición cuando el usuario no es ADMIN", async () => {
    sesion(["TOURIST"]);
    vi.mocked(cuentaApi.listarUsuarios).mockResolvedValue(pagina([]));

    renderAdmin();

    // La pantalla se monta, pero la barrera `enabled: esAdmin` impide la
    // llamada: el backend nunca recibe un intento fallido de más.
    await screen.findByRole("heading", { name: /cuentas registradas/i });

    expect(cuentaApi.listarUsuarios).not.toHaveBeenCalled();
  });

  it("muestra un estado vacío cuando no hay usuarios", async () => {
    vi.mocked(cuentaApi.listarUsuarios).mockResolvedValue(pagina([]));

    renderAdmin();

    expect(
      await screen.findByText(/todavía no hay usuarios registrados/i),
    ).toBeInTheDocument();
  });
});
