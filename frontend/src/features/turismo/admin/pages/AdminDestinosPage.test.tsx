/**
 * Pruebas del panel de administración de destinos.
 *
 * Se verifica lo que un usuario real depende de esta pantalla: que se listan
 * los destinos (incluidos los dados de baja), que la baja y la reactivación
 * llaman a la API correcta, y que un turista no dispara ninguna petición.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../../auth/context/AuthContext";
import * as api from "../api/destinosAdminApi";
import { listarCategorias } from "../../api/turismoApi";
import { AdminDestinosPage } from "./AdminDestinosPage";
import type { AtractivoAdmin, Categoria, Paginado } from "../../../../types/turismo";

vi.mock("../api/destinosAdminApi", async () => {
  const real = await vi.importActual<
    typeof import("../api/destinosAdminApi")
  >("../api/destinosAdminApi");

  // Se sustituyen los exports **nombrados**, que es como los importa
  // `useDestinosAdmin`. Sustituir los métodos del objeto `destinosAdminApi`
  // no surtiría efecto: el hook no pasa por él.
  return {
    ...real,
    listarDestinos: vi.fn(),
    obtenerDestino: vi.fn(),
    crearDestino: vi.fn(),
    actualizarDestino: vi.fn(),
    darDeBajaDestino: vi.fn(),
    reactivarDestino: vi.fn(),
  };
});

vi.mock("../../api/turismoApi", async () => {
  const real = await vi.importActual<typeof import("../../api/turismoApi")>(
    "../../api/turismoApi",
  );

  return {
    ...real,
    listarCategorias: vi.fn(),
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

function destino(overrides: Partial<AtractivoAdmin> = {}): AtractivoAdmin {
  return {
    id_atractivo: "a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
    nombre: "Valle de la Luna",
    descripcion: "Formaciones de arcilla en el altiplano.",
    direccion: "Zona Sur",
    duracion_minutos: 90,
    ubicacion: { longitud: -68.1375, latitud: -16.4961 },
    area: null,
    categorias: [5],
    fuente_origen: "INSTITUCIONAL",
    activo: true,
    fecha_creacion: "2026-10-03T18:14:30.495391-04:00",
    fecha_actualizacion: "2026-10-03T18:14:30.495398-04:00",
    ...overrides,
  };
}

const CATEGORIAS: Categoria[] = [
  { id_categoria: 5, nombre: "Naturaleza", descripcion: null, activo: true },
  { id_categoria: 1, nombre: "Aventura", descripcion: null, activo: true },
];

function pagina(
  results: AtractivoAdmin[],
  extra: Partial<Paginado<AtractivoAdmin>> = {},
): Paginado<AtractivoAdmin> {
  return { count: results.length, next: null, previous: null, results, ...extra };
}

function renderAdmin() {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={["/mi-cuenta/destinos"]}>
        <AuthProvider>
          <AdminDestinosPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminDestinosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sesion();
    vi.mocked(listarCategorias).mockResolvedValue(CATEGORIAS);
  });

  it("lista los destinos que devuelve el backend", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(
      pagina([
        destino(),
        destino({
          id_atractivo: "027f1e8d-47b4-4cdb-b8b2-fabf88fe50cd",
          nombre: "Mercado de las Brujas",
          duracion_minutos: 45,
          categorias: [1],
        }),
      ]),
    );

    renderAdmin();

    expect(await screen.findByText("Valle de la Luna")).toBeInTheDocument();
    expect(screen.getByText("Mercado de las Brujas")).toBeInTheDocument();
    expect(screen.getByText("2 destinos")).toBeInTheDocument();

    // `categorias` llega como ids: la tabla los cruza con los nombres.
    const tabla = within(screen.getByRole("table"));
    expect(tabla.getByText("Naturaleza")).toBeInTheDocument();
    expect(tabla.getByText("Aventura")).toBeInTheDocument();

    // La duración se formatea con la misma regla del catálogo público: 90 min
    // es "1 h 30 min" y 45 min queda como "45 min".
    expect(tabla.getByText("1 h 30 min")).toBeInTheDocument();
    expect(tabla.getByText("45 min")).toBeInTheDocument();
  });

  it("oculta los destinos dados de baja hasta que se pide verlos", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(
      pagina([
        destino(),
        destino({
          id_atractivo: "2",
          nombre: "Toro Norte",
          activo: false,
        }),
      ]),
    );

    renderAdmin();

    expect(await screen.findByText("Valle de la Luna")).toBeInTheDocument();
    expect(screen.queryByText("Toro Norte")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dados de baja" }));

    // Ahora sí aparece, con su etiqueta de "fuera del catálogo".
    expect(await screen.findByText("Toro Norte")).toBeInTheDocument();
    expect(screen.getByText("Fuera del catálogo")).toBeInTheDocument();
  });

  it("da de baja un destino activo llamando al DELETE del backend", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(
      pagina([destino()]),
    );
    vi.mocked(api.darDeBajaDestino).mockResolvedValue(undefined);

    renderAdmin();

    await screen.findByText("Valle de la Luna");

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    await waitFor(() =>
      expect(api.darDeBajaDestino).toHaveBeenCalledWith(
        "a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
      ),
    );
  });

  it("reactiva un destino dado de baja con el PATCH de activo", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(
      pagina([destino({ id_atractivo: "2", nombre: "Toro Norte", activo: false })]),
    );
    vi.mocked(api.reactivarDestino).mockResolvedValue(
      destino({ id_atractivo: "2", activo: true }),
    );

    renderAdmin();

    fireEvent.click(await screen.findByRole("button", { name: "Dados de baja" }));

    fireEvent.click(await screen.findByRole("button", { name: "Reactivar" }));

    await waitFor(() =>
      expect(api.reactivarDestino).toHaveBeenCalledWith("2"),
    );
  });

  it("filtra por texto sobre los destinos de la página", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(
      pagina([
        destino(),
        destino({ id_atractivo: "2", nombre: "Mercado de las Brujas" }),
      ]),
    );

    renderAdmin();

    await screen.findByText("Valle de la Luna");

    fireEvent.change(screen.getByLabelText(/buscar destino/i), {
      target: { value: "brujas" },
    });

    expect(screen.queryByText("Valle de la Luna")).not.toBeInTheDocument();
    expect(screen.getByText("Mercado de las Brujas")).toBeInTheDocument();
  });

  it("no lanza peticiones cuando el usuario no es ADMIN", async () => {
    sesion(["TOURIST"]);
    vi.mocked(api.listarDestinos).mockResolvedValue(pagina([]));

    renderAdmin();

    // La pantalla llega a montarse, pero `enabled: esAdmin` impide el envío.
    await screen.findByRole("heading", { name: /destinos registrados/i });

    expect(api.listarDestinos).not.toHaveBeenCalled();
  });

  it("muestra un estado vacío cuando no hay destinos", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(pagina([]));

    renderAdmin();

    expect(
      await screen.findByText(/todavía no hay destinos activos/i),
    ).toBeInTheDocument();
  });

  it("enlaza cada fila al detalle público y al formulario de edición", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(
      pagina([destino()]),
    );

    renderAdmin();

    await screen.findByText("Valle de la Luna");

    expect(
      screen.getByRole("link", { name: "Valle de la Luna" }),
    ).toHaveAttribute(
      "href",
      "/destinos/a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
    );

    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/mi-cuenta/destinos/a74e9ce4-9e17-4ce1-8a3e-415479ab6164/editar",
    );
  });

  it("ofrece el alta de un destino nuevo", async () => {
    vi.mocked(api.listarDestinos).mockResolvedValue(pagina([]));

    renderAdmin();

    expect(
      await screen.findByRole("link", { name: /nuevo destino/i }),
    ).toHaveAttribute("href", "/mi-cuenta/destinos/nuevo");
  });
});