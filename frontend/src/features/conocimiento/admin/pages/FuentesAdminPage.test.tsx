/**
 * Pruebas del panel único de fuentes.
 *
 * Cubre lo que el administrador hace en pantalla: buscar, revisar la
 * procedencia, aprobar completando los datos que la fuente no dio, vectorizar
 * y ver el estado real. También verifica que un turista no dispara peticiones:
 * la autoridad final es el 403 del backend.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../../auth/context/AuthContext";
import * as api from "../api/importacionesAdminApi";
import type {
  ImportacionLugares,
  LugarCandidato,
} from "../../../../types/conocimiento";
import { KeysImportacionesAdmin } from "../hooks/useImportacionesAdmin";
import { FuentesAdminPage } from "./FuentesAdminPage";

vi.mock("../api/importacionesAdminApi", async () => {
  const real = await vi.importActual<
    typeof import("../api/importacionesAdminApi")
  >("../api/importacionesAdminApi");
  // Los hooks consultan `importacionesAdminApi.listarImportaciones`, mientras
  // las mutaciones usan las funciones sueltas. Ambas rutas deben compartir los
  // mismos mocks para que la prueba no termine llamando al axios real.
  const importacionesAdminApi = {
    listarImportaciones: vi.fn(),
    crearImportacion: vi.fn(),
    obtenerCandidatos: vi.fn(),
    aprobarCandidato: vi.fn(),
    rechazarCandidato: vi.fn(),
    vectorizarImportacion: vi.fn(),
  };
  return { ...real, ...importacionesAdminApi, importacionesAdminApi };
});

const ID_IMP = "00000000-0000-0000-0000-000000000001";
const ID_CAND = "00000000-0000-0000-0000-000000000002";

function importacion(
  overrides: Partial<ImportacionLugares> = {},
): ImportacionLugares {
  return {
    id_importacion: ID_IMP,
    consulta: "museos de La Paz",
    ciudad: "La Paz",
    fuentes: ["overpass", "wikidata"],
    estado: "completado",
    error: "",
    encontrados: 1,
    candidatos_creados: 1,
    duplicados: 0,
    estado_vectorizacion: "sin_vectorizar",
    error_vectorizacion: "",
    vectorizado_en: null,
    fecha_creacion: "2026-11-26T10:00:00Z",
    fecha_actualizacion: "2026-11-26T10:00:00Z",
    ...overrides,
  };
}

function candidato(
  overrides: Partial<LugarCandidato> = {},
): LugarCandidato {
  return {
    id_candidato: ID_CAND,
    importacion: ID_IMP,
    fuente: "overpass",
    id_externo: "node/123",
    hash_contenido: "abc123def456",
    nombre: "Museo de Instrumentos Musicales",
    descripcion: "",
    categoria_sugerida: "Cultura",
    categoria: "",
    latitud: -16.4962,
    longitud: -68.1391,
    direccion: "",
    horario_declarado: "",
    sitio_web: "",
    url_fuente: "https://www.openstreetmap.org/node/123",
    licencia: "ODbL — OpenStreetMap contributors",
    duracion_minutos: null,
    estado: "pendiente",
    atractivo: null,
    notas_revision: "",
    fecha_creacion: "2026-11-26T10:00:00Z",
    ...overrides,
  };
}

function cliente() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, retryDelay: 0 } },
  });
}

function sesion(roles: string[]) {
  localStorage.setItem("turismo_access_token", "access-test");
  localStorage.setItem("turismo_refresh_token", "refresh-test");
  localStorage.setItem(
    "turismo_auth_user",
    JSON.stringify({ nombre: "Admin", email: "admin@test.com", roles }),
  );
}

function renderPagina(queryClient = cliente()) {
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/mi-cuenta/fuentes"]}>
          <AuthProvider>
            <FuentesAdminPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
    queryClient,
  };
}

describe("FuentesAdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sesion(["ADMIN"]);
    vi.mocked(api.listarImportaciones).mockResolvedValue([importacion()]);
    vi.mocked(api.obtenerCandidatos).mockResolvedValue([candidato()]);
    vi.mocked(api.crearImportacion).mockResolvedValue(importacion());
    vi.mocked(api.aprobarCandidato).mockResolvedValue({
      id_atractivo: "00000000-0000-0000-0000-000000000003",
      id_fuente: "00000000-0000-0000-0000-000000000004",
      fragmentos: 1,
      actualizado: true,
      vectorizacion_encolada: true,
      estado_vectorizacion: "pendiente",
    });
    vi.mocked(api.rechazarCandidato).mockResolvedValue(candidato());
    vi.mocked(api.vectorizarImportacion).mockResolvedValue({
      id_importacion: ID_IMP,
      estado: "pendiente",
      fuentes: 1,
      mensaje: "Vectorización encolada.",
    });
  });

  it("muestra una importación encolada sin simular que ya terminó", async () => {
    vi.mocked(api.listarImportaciones).mockResolvedValue([
      importacion({ estado: "pendiente", encontrados: 0, candidatos_creados: 0 }),
    ]);
    renderPagina();

    expect(await screen.findByText("En cola")).toBeInTheDocument();
    expect(screen.queryByText("Completado")).not.toBeInTheDocument();
  });

  it("recarga candidatos cuando una importación termina", async () => {
    const pendiente = importacion({
      estado: "pendiente",
      encontrados: 0,
      candidatos_creados: 0,
    });
    vi.mocked(api.listarImportaciones).mockResolvedValue([pendiente]);
    vi.mocked(api.obtenerCandidatos)
      .mockResolvedValueOnce([])
      .mockResolvedValue([candidato()]);
    const { queryClient } = renderPagina();

    expect(await screen.findByText("En cola")).toBeInTheDocument();
    expect(
      screen.queryByText("Museo de Instrumentos Musicales"),
    ).not.toBeInTheDocument();

    // "En cola" se pinta desde el historial antes de que el efecto de
    // selección fije la importación. Esperar al primer fetch garantiza que
    // `estadoAnterior` ya registró "pendiente" y la transición se detecte.
    await waitFor(() => {
      expect(api.obtenerCandidatos).toHaveBeenCalledTimes(1);
    });

    act(() => {
      queryClient.setQueryData(KeysImportacionesAdmin.lista, [
        importacion({ estado: "completado" }),
      ]);
    });

    expect(
      await screen.findByText("Museo de Instrumentos Musicales"),
    ).toBeInTheDocument();
    expect(api.obtenerCandidatos).toHaveBeenCalledTimes(2);
  });

  it("muestra la procedencia y marca como no verificados los datos ausentes", async () => {
    renderPagina();

    expect(await screen.findByText("Museo de Instrumentos Musicales")).toBeInTheDocument();
    expect(
      screen.getByText(/ODbL — OpenStreetMap contributors/),
    ).toBeInTheDocument();
    expect(screen.getByText(/node\/123/)).toBeInTheDocument();
    expect(screen.getAllByText("No verificado").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /registro original/i })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/node/123",
    );
  });

  it("aprueba con los datos revisados y luego permite vectorizar", async () => {
    vi.mocked(api.obtenerCandidatos)
      .mockResolvedValueOnce([candidato()])
      .mockResolvedValue([
        candidato({ estado: "aprobado", categoria: "Cultura", duracion_minutos: 60 }),
      ]);

    renderPagina();
    expect(await screen.findByText("Museo de Instrumentos Musicales")).toBeInTheDocument();

    const botonAprobar = screen.getByRole("button", { name: "Aprobar y publicar" });
    expect(botonAprobar).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/categoría revisada/i), {
      target: { value: "Cultura" },
    });
    fireEvent.change(screen.getByLabelText(/duración \(minutos\)/i), {
      target: { value: "60" },
    });
    expect(botonAprobar).toBeEnabled();

    fireEvent.click(botonAprobar);
    await waitFor(() =>
      expect(api.aprobarCandidato).toHaveBeenCalledWith(ID_CAND, {
        categoria: "Cultura",
        duracion_minutos: 60,
      }),
    );

    const botonVectorizar = await screen.findByRole("button", {
      name: "Vectorizar aprobados",
    });
    await waitFor(() => expect(botonVectorizar).toBeEnabled());
    fireEvent.click(botonVectorizar);
    await waitFor(() =>
      expect(api.vectorizarImportacion).toHaveBeenCalledWith(
        ID_IMP,
        expect.anything(),
      ),
    );
  });

  it("rechaza guardando el motivo escrito por el administrador", async () => {
    renderPagina();
    expect(
      await screen.findByText("Museo de Instrumentos Musicales"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/motivo del rechazo/i), {
      target: { value: "Duplicado del destino municipal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    await waitFor(() =>
      expect(api.rechazarCandidato).toHaveBeenCalledWith(
        ID_CAND,
        "Duplicado del destino municipal",
      ),
    );
  });

  it("inicia una búsqueda pasando por el backend, sin llamadas externas", async () => {
    renderPagina();
    fireEvent.change(screen.getByLabelText(/qué lugares buscamos/i), {
      target: { value: "restaurantes en La Paz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar candidatos" }));

    await waitFor(() =>
      expect(api.crearImportacion).toHaveBeenCalledWith(
        {
          consulta: "restaurantes en La Paz",
          ciudad: "La Paz",
          fuentes: ["overpass", "wikidata"],
          limite: 20,
        },
        expect.anything(),
      ),
    );
  });

  it("avisa que la importación sigue en segundo plano y que el error será visible", async () => {
    vi.mocked(api.crearImportacion).mockImplementation(
      () => new Promise(() => undefined),
    );
    renderPagina();
    fireEvent.change(screen.getByLabelText(/qué lugares buscamos/i), {
      target: { value: "bares de La Paz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar candidatos" }));

    expect(
      await screen.findByText(/Procesando en segundo plano/),
    ).toBeInTheDocument();
    expect(screen.getByText(/el error real si las fuentes no responden/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encolando…" })).toBeDisabled();
  });

  it("muestra el error de vectorización en vez de simular éxito", async () => {
    vi.mocked(api.listarImportaciones).mockResolvedValue([
      importacion({
        estado_vectorizacion: "error",
        error_vectorizacion: "Ollama no disponible",
      }),
    ]);
    renderPagina();

    expect(
      await screen.findByText(/La vectorización falló: Ollama no disponible/),
    ).toBeInTheDocument();
  });

  it("un turista no dispara ninguna petición al panel", async () => {
    sesion(["TOURIST"]);
    renderPagina();

    await waitFor(() => expect(screen.getByText("Nueva importación")).toBeInTheDocument());
    expect(api.listarImportaciones).not.toHaveBeenCalled();
    expect(api.obtenerCandidatos).not.toHaveBeenCalled();
  });
});
