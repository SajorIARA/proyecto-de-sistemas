/**
 * Pruebas de integración del formulario de preferencias (issue #23).
 *
 * Montan la pantalla real con todos sus providers (Router, Auth, Query y
 * `PreferenciasProvider`) y mockean solo la capa HTTP. Así se verifica el
 * recorrido completo: categorías del backend → interacción → validación en
 * cliente → borrador local → guardado en `/api/preferences/` y
 * `/api/recomendaciones/consultas/`.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PREFERENCIAS_DRAFT_KEY } from "../../../config/preferencias";
import type { Categoria } from "../../../types/turismo";
import { AuthProvider } from "../../auth/context/AuthContext";
import { listarCategorias } from "../../turismo/api/turismoApi";
import { guardarPerfil, listarMisPreferencias } from "../api/preferenciasApi";
import { PreferenciasProvider } from "../context/PreferenciasContext";
import { PreferenciasPage } from "./PreferenciasPage";

vi.mock("../../auth/api/authApi", () => ({
  authApi: { login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

// `useCategorias` importa `listarCategorias` como named import directo, así
// que hay que sobrescribirlo en el módulo. Se conserva el resto con
// `importActual` para no romper las clases de error que exporta.
vi.mock("../../turismo/api/turismoApi", async () => {
  const real = await vi.importActual<typeof import("../../turismo/api/turismoApi")>(
    "../../turismo/api/turismoApi",
  );

  return { ...real, listarCategorias: vi.fn() };
});

// `useMisPreferencias` / `useGuardarPerfil` usan los named exports directos.
vi.mock("../api/preferenciasApi", async () => {
  const real = await vi.importActual<typeof import("../api/preferenciasApi")>(
    "../api/preferenciasApi",
  );

  return {
    ...real,
    listarMisPreferencias: vi.fn(),
    guardarPerfil: vi.fn(),
  };
});

const CATEGORIAS: Categoria[] = [
  { id_categoria: 1, nombre: "Cultura", descripcion: null, activo: true },
  { id_categoria: 2, nombre: "Aventura", descripcion: null, activo: true },
  { id_categoria: 3, nombre: "Gastronomía", descripcion: null, activo: true },
];

const categoriasMock = vi.mocked(listarCategorias);
const listarPreferenciasMock = vi.mocked(listarMisPreferencias);
const guardarMock = vi.mocked(guardarPerfil);

function cliente() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, retryDelay: 0 },
      mutations: { retry: false },
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

function renderPagina() {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={["/mi-cuenta/preferencias"]}>
        <AuthProvider>
          <PreferenciasProvider>
            <Routes>
              <Route
                path="/mi-cuenta/preferencias"
                element={<PreferenciasPage />}
              />
            </Routes>
          </PreferenciasProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Espera a que los chips estén cargados (categorías resueltas). */
async function esperarCategorias() {
  await screen.findByTestId("chip-categoria-1");
}

async function guardarFormulario() {
  fireEvent.click(
    screen.getByRole("button", { name: /guardar preferencias/i }),
  );
}

describe("PreferenciasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    categoriasMock.mockResolvedValue(CATEGORIAS);
    listarPreferenciasMock.mockResolvedValue([]);
    guardarMock.mockResolvedValue({ preferencias: [], consulta: null });
  });

  it("carga las categorías del backend y muestra el formulario", async () => {
    sesion();

    renderPagina();

    expect(
      screen.getByRole("heading", { name: /preferencias y restricciones/i }),
    ).toBeInTheDocument();

    await esperarCategorias();

    expect(screen.getByTestId("chip-categoria-3")).toHaveTextContent(
      "Gastronomía",
    );
    expect(screen.getByTestId("slider-presupuesto")).toBeInTheDocument();
    expect(screen.getByTestId("slider-duracion")).toBeInTheDocument();
  });

  it("precarga las categorías guardadas si no hay borrador local", async () => {
    sesion();
    listarPreferenciasMock.mockResolvedValue([
      { id: 5, categoria: 2, nivel_interes: "1.00" },
    ]);

    renderPagina();

    await esperarCategorias();

    await waitFor(() => {
      expect(screen.getByTestId("chip-categoria-2")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    // El resto sigue sin seleccionar.
    expect(screen.getByTestId("chip-categoria-1")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("respalda el borrador en localStorage y lo anuncia en pantalla", async () => {
    sesion();

    renderPagina();

    await esperarCategorias();

    fireEvent.change(screen.getByTestId("slider-presupuesto"), {
      target: { value: "1500" },
    });

    // El estado global se refleja de inmediato en el control y el resumen.
    expect(screen.getAllByText("Bs 1.500").length).toBeGreaterThan(0);

    // …y tras el debounce queda persistido en el navegador.
    await waitFor(() => {
      const crudo = localStorage.getItem(PREFERENCIAS_DRAFT_KEY);

      expect(crudo).not.toBeNull();
      expect(JSON.parse(crudo ?? "{}").presupuestoBob).toBe(1500);
    });

    const guardado = JSON.parse(
      localStorage.getItem(PREFERENCIAS_DRAFT_KEY) ?? "{}",
    );

    expect(guardado.presupuestoBob).toBe(1500);
    expect(
      await screen.findByText(/borrador guardado en este navegador/i),
    ).toBeInTheDocument();
  });

  it("envía las categorías y el presupuesto al guardar", async () => {
    sesion();

    renderPagina();

    await esperarCategorias();

    fireEvent.click(screen.getByTestId("chip-categoria-3"));
    fireEvent.change(screen.getByTestId("slider-presupuesto"), {
      target: { value: "1000" },
    });

    await guardarFormulario();

    await waitFor(() => {
      expect(guardarMock).toHaveBeenCalledTimes(1);
    });

    expect(guardarMock).toHaveBeenCalledWith({
      categorias: [3],
      consulta: null,
    });

    expect(
      await screen.findByText(/preferencias guardadas/i),
    ).toBeInTheDocument();
  });

  it("valida en el cliente y no llama al backend si faltan categorías", async () => {
    sesion();

    renderPagina();

    await esperarCategorias();

    await guardarFormulario();

    expect(
      await screen.findByText(/selecciona al menos una categoría/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/revisa los campos marcados antes de guardar/i),
    ).toBeInTheDocument();
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it("rechaza un punto de partida fuera del área de La Paz", async () => {
    sesion();

    renderPagina();

    await esperarCategorias();

    fireEvent.click(screen.getByTestId("chip-categoria-1"));
    fireEvent.change(screen.getByTestId("input-latitud"), {
      target: { value: "40.4168" },
    });
    fireEvent.change(screen.getByTestId("input-longitud"), {
      target: { value: "-3.7038" },
    });

    await guardarFormulario();

    expect(
      await screen.findByText(/debe estar dentro de La Paz/i),
    ).toBeInTheDocument();
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it("envía la duración en horas y el punto de partida válido", async () => {
    sesion();

    renderPagina();

    await esperarCategorias();

    fireEvent.click(screen.getByTestId("chip-categoria-1"));
    fireEvent.click(screen.getByTestId("unidad-dias"));
    fireEvent.change(screen.getByTestId("slider-duracion"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByTestId("input-latitud"), {
      target: { value: "-16.4966" },
    });
    fireEvent.change(screen.getByTestId("input-longitud"), {
      target: { value: "-68.1486" },
    });

    await guardarFormulario();

    await waitFor(() => {
      expect(guardarMock).toHaveBeenCalledTimes(1);
    });

    // 2 días viajan como 48 h; el punto va como GeoJSON [lon, lat].
    expect(guardarMock).toHaveBeenCalledWith({
      categorias: [1],
      consulta: {
        presupuesto_bob: 500,
        tiempo_horas: 48,
        punto_partida: { coordinates: [-68.1486, -16.4966] },
      },
    });
  });

  it("descarta el borrador local y vuelve al estado inicial", async () => {
    sesion();

    renderPagina();

    await esperarCategorias();

    fireEvent.click(screen.getByTestId("chip-categoria-3"));

    await waitFor(() => {
      expect(localStorage.getItem(PREFERENCIAS_DRAFT_KEY)).not.toBeNull();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /descartar borrador/i }),
    );

    await waitFor(() => {
      expect(localStorage.getItem(PREFERENCIAS_DRAFT_KEY)).toBeNull();
    });

    expect(screen.getByTestId("chip-categoria-3")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
