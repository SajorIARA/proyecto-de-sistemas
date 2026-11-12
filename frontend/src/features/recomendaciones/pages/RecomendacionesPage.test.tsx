/**
 * Pruebas de integración de la pantalla de recomendaciones (issue #29).
 *
 * Monta la página real con sus providers y mockea solo la capa HTTP
 * (`src/api/http`). Así se ejercitan el cliente real, el orden del Top-K,
 * los estados de carga/error/vacío y el chat con respuestas progresivas.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConsultaRecomendacion } from "../../../types/preferencias";
import { AuthProvider } from "../../auth/context/AuthContext";
import { PreferenciasProvider } from "../../preferencias/context/PreferenciasContext";
import { RecomendacionesPage } from "./RecomendacionesPage";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("../../../api/http", () => ({
  api: {
    get: (...args: unknown[]) => mocks.get(...args),
    post: (...args: unknown[]) => mocks.post(...args),
  },
}));

const CONSULTA: ConsultaRecomendacion = {
  id_consulta: "consulta-1",
  presupuesto_bob: "800.00",
  tiempo_horas: "6.00",
  punto_partida: "SRID=4326;POINT (-68.134 -16.495)",
  macrodistrito: "Centro",
  fecha_consulta: "2026-02-01T10:00:00-04:00",
};

interface ItemCrudo {
  id_atractivo: string;
  nombre: string;
  puntaje: number;
  distancia_km: number;
  costo_bob: string;
  duracion_horas?: string;
  categorias?: string[];
  viable?: boolean;
  motivos?: string[];
}

function item(cambios: ItemCrudo) {
  return {
    afinidad_categoria: 0.8,
    proximidad: 0.7,
    holgura_presupuesto: 0.6,
    holgura_tiempo: 0.5,
    factor_penalizacion: 1,
    viable: true,
    motivos: [],
    categorias: ["Cultura"],
    duracion_horas: "2.00",
    latitud: -16.5,
    longitud: -68.13,
    ...cambios,
  };
}

function respuesta(recomendaciones: ReturnType<typeof item>[]) {
  return {
    data: {
      id_consulta: "consulta-1",
      generado_en: "2026-02-01T12:00:00Z",
      total_activos: 24,
      total_evaluados: 9,
      total_recomendaciones: recomendaciones.length,
      radio_km: 15,
      top_k: 8,
      recomendaciones,
    },
  };
}

const TOP_K = [
  item({
    id_atractivo: "b",
    nombre: "Lejano",
    puntaje: 0.4,
    distancia_km: 9,
    costo_bob: "20.00",
  }),
  item({
    id_atractivo: "a",
    nombre: "Cercano",
    puntaje: 0.9,
    distancia_km: 2,
    costo_bob: "15.00",
  }),
  item({
    id_atractivo: "c",
    nombre: "Muy cercano",
    puntaje: 0.9,
    distancia_km: 1,
    costo_bob: "10.00",
  }),
];

function cliente() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
}

function sesion() {
  localStorage.setItem("turismo_access_token", "access-test");
  localStorage.setItem("turismo_refresh_token", "refresh-test");
  localStorage.setItem(
    "turismo_auth_user",
    JSON.stringify({
      nombre: "Jordan Arispe",
      email: "jordan@example.com",
      roles: ["TOURIST"],
    }),
  );
}

function renderPagina() {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={["/mi-cuenta/recomendaciones"]}>
        <AuthProvider>
          <PreferenciasProvider>
            <RecomendacionesPage />
          </PreferenciasProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RecomendacionesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sesion();

    mocks.get.mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [CONSULTA],
      },
    });
    mocks.post.mockResolvedValue(respuesta(TOP_K));
  });

  it("precarga el perfil guardado y muestra el Top-K ordenado por afinidad", async () => {
    renderPagina();

    const tarjetas = await screen.findAllByTestId("tarjeta-recomendacion");

    expect(tarjetas).toHaveLength(3);
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((titulo) => titulo.textContent),
    ).toEqual(["Muy cercano", "Cercano", "Lejano"]);

    expect(screen.getByText("Bs 800", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("6 horas · 6 h")).toBeInTheDocument();
    expect(screen.getByText(/ordenados por afinidad/i)).toBeInTheDocument();

    const primera = within(tarjetas[0]);
    expect(
      primera.getByRole("img", { name: "90 % de afinidad con tu perfil" }),
    ).toBeInTheDocument();

    expect(mocks.post).toHaveBeenCalledWith(
      "/recomendaciones/recomendar/",
      expect.objectContaining({
        presupuesto_bob: 800,
        tiempo_horas: 6,
        radio_km: 15,
        top_k: 8,
      }),
    );
  });

  it("desglosa entrada, traslado y total en bolivianos", async () => {
    mocks.post.mockResolvedValue(
      respuesta([
        item({
          id_atractivo: "a",
          nombre: "Mirador",
          puntaje: 0.9,
          distancia_km: 4,
          costo_bob: "30.00",
          duracion_horas: "2.00",
        }),
      ]),
    );

    renderPagina();

    const [tarjeta] = await screen.findAllByTestId("tarjeta-recomendacion");
    const detalle = within(tarjeta);

    expect(detalle.getByText("Bs 30")).toBeInTheDocument();
    expect(detalle.getByText("≈ Bs 24")).toBeInTheDocument();
    expect(detalle.getByText("≈ Bs 54")).toBeInTheDocument();
    expect(detalle.getByText(/4 km · 27 min/)).toBeInTheDocument();
    expect(detalle.getByText(/Visita de 2 h/)).toBeInTheDocument();
    expect(detalle.getByText(/ida y vuelta/i)).toBeInTheDocument();
  });

  it("muestra un esqueleto accesible mientras calcula el ranking", async () => {
    mocks.post.mockReturnValue(new Promise(() => {}));

    renderPagina();

    expect(
      await screen.findByTestId("lista-recomendaciones-cargando"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/calculando tus recomendaciones personalizadas/i),
    ).toBeInTheDocument();
  });

  it("muestra el estado de error con opción de reintentar", async () => {
    mocks.post.mockRejectedValue(new Error("sin red"));

    renderPagina();

    expect(
      await screen.findByText("No pudimos calcular tus recomendaciones"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reintentar/i }),
    ).toBeInTheDocument();
  });

  it("ofrece ampliar el radio cuando no hay coincidencias", async () => {
    mocks.post.mockResolvedValue(respuesta([]));

    renderPagina();

    expect(
      await screen.findByText(/no encontramos destinos dentro de estos límites/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /ampliar radio a 25 km/i }),
    );

    await waitFor(() => {
      expect(mocks.post).toHaveBeenLastCalledWith(
        "/recomendaciones/recomendar/",
        expect.objectContaining({ radio_km: 25 }),
      );
    });
  });

  it("recalcula cuando el turista ajusta el radio y pulsa actualizar", async () => {
    renderPagina();

    await screen.findAllByTestId("tarjeta-recomendacion");

    fireEvent.change(screen.getByLabelText("Radio"), {
      target: { value: "25" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /actualizar ranking/i }),
    );

    await waitFor(() => {
      expect(mocks.post).toHaveBeenLastCalledWith(
        "/recomendaciones/recomendar/",
        expect.objectContaining({ radio_km: 25 }),
      );
    });
  });

  it("conversa con el asistente con estado de carga y respuesta progresiva", async () => {
    renderPagina();

    await screen.findAllByTestId("tarjeta-recomendacion");

    fireEvent.click(
      screen.getByRole("button", { name: "¿Cuál es la mejor opción?" }),
    );

    expect(await screen.findByText("Pensando…")).toBeInTheDocument();

    expect(
      await screen.findByText(/con tu perfil/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText(/tú dijiste:/i)).toBeInTheDocument();
  });
});
