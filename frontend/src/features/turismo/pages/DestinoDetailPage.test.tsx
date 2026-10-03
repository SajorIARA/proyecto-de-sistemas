import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/context/AuthContext";
import {
  TurismoApiError,
  listarHorariosDe,
  listarTarifasDe,
  obtenerAtractivo,
} from "../api/turismoApi";
import { DestinoDetailPage } from "./DestinoDetailPage";
import type { Atractivo, Horario, Tarifa } from "../../../types/turismo";

vi.mock("../api/turismoApi", async () => {
  const real = await vi.importActual<typeof import("../api/turismoApi")>(
    "../api/turismoApi",
  );

  return {
    ...real,
    obtenerAtractivo: vi.fn(),
    listarHorariosDe: vi.fn(),
    listarTarifasDe: vi.fn(),
    listarAtractivos: vi.fn(),
    listarCategorias: vi.fn(),
    listarFacetas: vi.fn(),
  };
});

const ID = "22222222-2222-2222-2222-222222222222";

function atractivo(overrides: Partial<Atractivo> = {}): Atractivo {
  return {
    id: ID,
    nombre: "Valle de la Luna",
    descripcion: "Formaciones rocosas modeladas por la erosión.",
    direccion: "Av. Valle de la Luna, Mallasa",
    duracion_minutos: 120,
    ubicacion: { longitud: -68.0673, latitud: -16.5685 },
    area: null,
    categorias: ["Naturaleza"],
    fuente_origen: "INSTITUCIONAL",
    activo: true,
    fecha_creacion: "2026-01-01T00:00:00Z",
    fecha_actualizacion: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function horario(dia: number, extra: Partial<Horario> = {}): Horario {
  return {
    id_horario: dia,
    atractivo: ID,
    dia_semana: dia,
    hora_apertura: "09:00:00",
    hora_cierre: "17:00:00",
    cerrado: false,
    vigente_desde: null,
    vigente_hasta: null,
    ...extra,
  };
}

function tarifa(extra: Partial<Tarifa> = {}): Tarifa {
  return {
    id_tarifa: 1,
    atractivo: ID,
    tipo_tarifa: 1,
    tipo_tarifa_nombre: "General",
    monto: "30.00",
    moneda: "BOB",
    vigente_desde: null,
    vigente_hasta: null,
    observacion: null,
    ...extra,
  };
}

function cliente() {
  return new QueryClient({
    // retryDelay: 0 evita esperar el backoff por defecto de TanStack Query
    // (1000 ms), que supera el timeout de `findBy*` y vuelve flaky el test.
    defaultOptions: {
      queries: { retry: false, gcTime: 0, retryDelay: 0 },
    },
  });
}

function renderDetalle(ruta = `/destinos/${ID}`) {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <AuthProvider>
          <Routes>
            <Route path="/destinos" element={<h1>Catálogo</h1>} />
            <Route path="/destinos/:id" element={<DestinoDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DestinoDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(listarHorariosDe).mockResolvedValue([]);
    vi.mocked(listarTarifasDe).mockResolvedValue([]);
  });

  it("muestra el skeleton mientras carga el destino", () => {
    vi.mocked(obtenerAtractivo).mockReturnValue(new Promise(() => undefined));

    renderDetalle();

    expect(screen.getByTestId("detalle-skeleton")).toBeInTheDocument();
  });

  it("carga la información del destino por su id", async () => {
    vi.mocked(obtenerAtractivo).mockResolvedValue(atractivo());

    renderDetalle();

    expect(
      await screen.findByRole("heading", { name: "Valle de la Luna" }),
    ).toBeInTheDocument();

    expect(obtenerAtractivo).toHaveBeenCalledWith(ID);
    expect(
      screen.getByText("Formaciones rocosas modeladas por la erosión."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Av. Valle de la Luna, Mallasa"),
    ).toBeInTheDocument();
  });

  it("muestra horario de atención y costos oficiales", async () => {
    vi.mocked(obtenerAtractivo).mockResolvedValue(atractivo());
    vi.mocked(listarHorariosDe).mockResolvedValue([
      horario(1),
      horario(3, { cerrado: true, hora_apertura: null, hora_cierre: null }),
    ]);
    vi.mocked(listarTarifasDe).mockResolvedValue([
      tarifa({ id_tarifa: 1, tipo_tarifa_nombre: "General", monto: "30.00" }),
      tarifa({ id_tarifa: 2, tipo_tarifa_nombre: "Niño", monto: "10.00" }),
    ]);

    renderDetalle();

    const seccionHorario = await screen.findByRole("region", {
      name: /horario de atención/i,
    });

    // La región aparece antes de que lleguen los datos: hay que esperar
    // con findBy* dentro de ella.
    expect(await within(seccionHorario).findByText("Lunes")).toBeInTheDocument();
    expect(within(seccionHorario).getByText("09:00 – 17:00")).toBeInTheDocument();
    expect(within(seccionHorario).getByText("Miércoles")).toBeInTheDocument();
    expect(within(seccionHorario).getByText("Cerrado")).toBeInTheDocument();

    const seccionCostos = await screen.findByRole("region", {
      name: /costos oficiales/i,
    });

    expect(await within(seccionCostos).findByText("General")).toBeInTheDocument();
    expect(within(seccionCostos).getByText("Niño")).toBeInTheDocument();
    expect(within(seccionCostos).getByText("10 BOB")).toBeInTheDocument();
  });

  it("trata una tarifa de 0 como gratuita", async () => {
    vi.mocked(obtenerAtractivo).mockResolvedValue(atractivo());
    vi.mocked(listarTarifasDe).mockResolvedValue([
      tarifa({ tipo_tarifa_nombre: "Adulto mayor", monto: "0.00" }),
    ]);

    renderDetalle();

    const seccionCostos = await screen.findByRole("region", {
      name: /costos oficiales/i,
    });

    expect(await within(seccionCostos).findByText("Gratuito")).toBeInTheDocument();
  });

  it("reserva el espacio del mapa con la coordenada PostGIS", async () => {
    vi.mocked(obtenerAtractivo).mockResolvedValue(atractivo());

    renderDetalle();

    const mapa = await screen.findByTestId("mapa-placeholder");

    expect(mapa).toBeInTheDocument();
    // latitud, longitud con 5 decimales
    expect(mapa).toHaveTextContent("-16.56850, -68.06730");
  });

  it("deja reservado el bloque de descripción histórica", async () => {
    vi.mocked(obtenerAtractivo).mockResolvedValue(atractivo());

    renderDetalle();

    expect(
      await screen.findByTestId("descripcion-historica-placeholder"),
    ).toBeInTheDocument();
  });

  it("muestra un 404 propio cuando el destino no existe", async () => {
    vi.mocked(obtenerAtractivo).mockRejectedValue(
      new TurismoApiError("Este destino turístico no existe.", 404),
    );

    renderDetalle("/destinos/no-existe");

    expect(
      await screen.findByRole("heading", { name: /no encontramos este destino/i }),
    ).toBeInTheDocument();

    expect(screen.getByText(/error 404/i)).toBeInTheDocument();
  });

  it("ofrece volver al catálogo conservando la categoría activa", async () => {
    vi.mocked(obtenerAtractivo).mockResolvedValue(atractivo());

    renderDetalle(`/destinos/${ID}?categoria=Naturaleza`);

    const volver = await screen.findAllByRole("link", {
      name: /volver al catálogo/i,
    });

    expect(volver[0]).toHaveAttribute(
      "href",
      "/destinos?categoria=Naturaleza",
    );
  });

  it("muestra un error reintentable ante un fallo distinto de 404", async () => {
    vi.mocked(obtenerAtractivo).mockRejectedValue(
      new TurismoApiError("Fallo de red", 0),
    );

    renderDetalle();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/fallo de red/i);

    vi.mocked(obtenerAtractivo).mockResolvedValue(atractivo());

    fireEvent.click(within(alerta).getByRole("button", { name: /reintentar/i }));

    expect(
      await screen.findByRole("heading", { name: "Valle de la Luna" }),
    ).toBeInTheDocument();
  });
});
