import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { RutaBuilderPage } from "./RutaBuilderPage";
import type { Atractivo } from "../../../types/turismo";

const mockUseRuta = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", async () => {
  const real = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return { ...real, useQuery: vi.fn() };
});

vi.mock("../components/MapaRuta", () => ({
  MapaRuta: () => <div>Mapa de la ruta</div>,
}));

vi.mock("../../auth/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("../context/RutaContext", () => ({
  useRuta: () => mockUseRuta(),
}));

function renderBuilder(ruta = "/destinos?vista=armar") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <RutaBuilderPage />
    </MemoryRouter>,
  );
}

/** Espía de la ubicación para comprobar el `redirect` del login. */
function CapturarUbicacion() {
  const ubicacion = useLocation();
  return (
    <p data-testid="ruta-actual">
      {ubicacion.pathname}
      {ubicacion.search}
    </p>
  );
}

describe("RutaBuilderPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseRuta.mockReturnValue({
      destinos: [],
      rutas: [
        { id: "ruta-1", nombre: "Mi ruta", destinos: [], guardada: false },
      ],
      rutaActivaId: "ruta-1",
      contiene: () => false,
      alternar: vi.fn(),
      quitar: vi.fn(),
      crearRuta: vi.fn(),
      seleccionarRuta: vi.fn(),
      renombrarRuta: vi.fn(),
      guardarRuta: vi.fn(),
    });
  });

  it("muestra estados de carga coherentes mientras llega el inventario", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as never);

    renderBuilder();

    expect(screen.getByText("Cargando inventario…")).toBeInTheDocument();
    expect(screen.getByText("Destinos (…)")).toBeInTheDocument();
    expect(
      screen.getByText("Cargando sugerencias del inventario…"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/ya añadiste todos los destinos/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Mapa de la ruta")).not.toBeInTheDocument();
  });

  it("informa la recomendación vacía cuando el inventario cargó", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { results: [] },
      isPending: false,
      isError: false,
    } as never);

    renderBuilder();

    expect(screen.getByText("Destinos (0)")).toBeInTheDocument();
    expect(
      screen.getByText("No hay más sugerencias con los filtros actuales."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no hay coincidencias/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Precio")).toBeInTheDocument();
    expect(screen.getAllByText("Zona").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("group", { name: /filtrar catálogo por categoría/i }),
    ).toBeInTheDocument();
    const panelFiltros = screen
      .getByRole("heading", { name: /encuentra tu parada/i })
      .closest("aside");
    expect(panelFiltros).toHaveClass("chuki-route-filters");
  });

  it("ofrece el punto de partida dentro del panel de filtros", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { results: [] },
      isPending: false,
      isError: false,
    } as never);

    renderBuilder();

    const panelFiltros = screen
      .getByRole("heading", { name: /encuentra tu parada/i })
      .closest("aside");
    expect(panelFiltros).not.toBeNull();
    expect(
      within(panelFiltros!).getByRole("button", { name: "Marcar en el mapa" }),
    ).toBeInTheDocument();
    expect(
      within(panelFiltros!).getByRole("button", { name: "Usar mi ubicación" }),
    ).toBeInTheDocument();
  });

  it("toma el origen de la URL y no inventa minutos si no hay ruta calculada", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { results: [] },
      isPending: false,
      isError: false,
    } as never);

    renderBuilder(
      "/destinos?vista=armar&paso=3&origen_lat=-16.5&origen_lon=-68.13&origen_tipo=mapa",
    );

    expect(screen.getAllByText("Punto en el mapa").length).toBeGreaterThan(0);
    expect(screen.getByText("No verificado")).toBeInTheDocument();
  });

  it("conserva el origen y los filtros al pedir login desde la revisión", async () => {
    const paradas: Atractivo[] = [
      {
        id: "destino-1",
        nombre: "Mirador Uno",
        descripcion: "Vista panorámica.",
        direccion: "Centro",
        duracion_minutos: 45,
        ubicacion: { longitud: -68.13, latitud: -16.49 },
        area: null,
        categorias: ["Naturaleza"],
        fuente_origen: "test",
        activo: true,
        fecha_creacion: "2026-01-01",
        fecha_actualizacion: "2026-01-01",
      },
    ];
    mockUseRuta.mockReturnValue({
      destinos: paradas,
      rutas: [{ id: "ruta-1", nombre: "Mi ruta", destinos: paradas, guardada: false }],
      rutaActivaId: "ruta-1",
      contiene: () => true,
      alternar: vi.fn(),
      quitar: vi.fn(),
      crearRuta: vi.fn(),
      seleccionarRuta: vi.fn(),
      renombrarRuta: vi.fn(),
      guardarRuta: vi.fn(),
    });
    vi.mocked(useQuery).mockReturnValue({
      data: { results: [] },
      isPending: false,
      isError: false,
    } as never);

    render(
      <MemoryRouter
        initialEntries={[
          "/destinos?vista=armar&paso=3&categoria=Cultura&origen_lat=-16.5&origen_lon=-68.13&origen_tipo=mapa",
        ]}
      >
        <CapturarUbicacion />
        <Routes>
          <Route path="/destinos" element={<RutaBuilderPage />} />
          <Route path="/login" element={<p>Iniciar sesión</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ingresar para terminar" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("ruta-actual")).toHaveTextContent("/login?redirect="),
    );
    const destino = decodeURIComponent(
      screen.getByTestId("ruta-actual").textContent ?? "",
    );
    expect(destino).toContain("origen_lat=-16.5");
    expect(destino).toContain("origen_tipo=mapa");
    expect(destino).toContain("categoria=Cultura");
    expect(destino).toContain("paso=3");
  });

  it("precarga el tiempo indicado desde la portada", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { results: [] },
      isPending: false,
      isError: false,
    } as never);

    renderBuilder("/destinos?vista=armar&tiempo=2-horas");

    expect(screen.getByText("2 horas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cambiar condiciones" }),
    ).toBeInTheDocument();
  });

  it("recupera la revisión detallada y muestra una acción explícita para terminar", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { results: [] },
      isPending: false,
      isError: false,
    } as never);

    renderBuilder("/destinos?vista=armar&paso=3");

    expect(
      screen.getByRole("heading", {
        name: /revisa cada parte antes de guardar/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Costo mínimo conocido")).toBeInTheDocument();
    expect(screen.getByText("Mapa de la ruta")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ingresar para terminar/i }),
    ).toBeInTheDocument();
  });

  it("muestra las paradas en una sola lista compacta, sin tarjetas individuales ni imágenes", () => {
    const paradas: Atractivo[] = [
      {
        id: "destino-1",
        nombre: "Parque Uno",
        descripcion: "Un espacio verde junto al centro.",
        direccion: "Centro",
        duracion_minutos: 45,
        ubicacion: { longitud: -68.13, latitud: -16.49 },
        area: null,
        categorias: ["Naturaleza"],
        fuente_origen: "test",
        activo: true,
        fecha_creacion: "2026-01-01",
        fecha_actualizacion: "2026-01-01",
      },
      {
        id: "destino-2",
        nombre: "Museo Dos",
        descripcion: "Colección de historia local.",
        direccion: "Sopocachi",
        duracion_minutos: 90,
        ubicacion: null,
        area: null,
        categorias: ["Cultura"],
        fuente_origen: "test",
        activo: true,
        fecha_creacion: "2026-01-01",
        fecha_actualizacion: "2026-01-01",
      },
    ];

    mockUseRuta.mockReturnValue({
      destinos: paradas,
      rutas: [{ id: "ruta-1", nombre: "Mi ruta", destinos: paradas, guardada: false }],
      rutaActivaId: "ruta-1",
      contiene: (id: string) => paradas.some((parada) => parada.id === id),
      alternar: vi.fn(),
      quitar: vi.fn(),
      crearRuta: vi.fn(),
      seleccionarRuta: vi.fn(),
      renombrarRuta: vi.fn(),
      guardarRuta: vi.fn(),
    });
    vi.mocked(useQuery).mockReturnValue({
      data: { results: [] },
      isPending: false,
      isError: false,
    } as never);

    renderBuilder("/destinos?vista=armar&paso=3");

    const lista = screen.getByRole("list", { name: "Paradas del itinerario" });
    const filas = within(lista).getAllByRole("listitem");
    const panelItinerario = lista.closest("section");

    expect(filas).toHaveLength(2);
    expect(panelItinerario).toHaveClass("chuki-route-itinerary");
    expect(within(filas[0]).getByRole("heading", { name: "Parque Uno" })).toBeInTheDocument();
    expect(within(filas[1]).getByRole("heading", { name: "Museo Dos" })).toBeInTheDocument();
    expect(within(filas[0]).getByText("45 min")).toBeInTheDocument();
    expect(within(filas[0]).getByText("Centro")).toBeInTheDocument();
    expect(within(filas[0]).getByText("Confirmada en mapa")).toBeInTheDocument();
    expect(within(filas[1]).queryByText("Colección de historia local.")).not.toBeInTheDocument();
    expect(within(filas[0]).queryByText("Naturaleza")).not.toBeInTheDocument();
    expect(lista).toHaveClass("divide-y");
    expect(filas[0]).not.toHaveClass("bg-white");
    expect(filas[0]).not.toHaveClass("border");
    expect(lista.querySelectorAll("img")).toHaveLength(0);
  });

  it("muestra la tarifa pública más baja en las tarjetas", () => {
    const destino = {
      id: "atractivo-1",
      nombre: "Museo de prueba",
      descripcion: "Historia y patrimonio",
      direccion: "Centro",
      duracion_minutos: 60,
      ubicacion: null,
      area: null,
      categorias: ["Cultura"],
      fuente_origen: "test",
      activo: true,
      fecha_creacion: "2026-01-01",
      fecha_actualizacion: "2026-01-01",
    };

    vi.mocked(useQuery)
      .mockReturnValueOnce({
        data: { count: 1, results: [destino] },
        isPending: false,
        isError: false,
      } as never)
      .mockReturnValueOnce({
        data: {
          facetas: null,
          tarifas: [
            {
              id_tarifa: 1,
              atractivo: "atractivo-1",
              tipo_tarifa: 1,
              tipo_tarifa_nombre: "General",
              monto: "20.00",
              moneda: "BOB",
              vigente_desde: null,
              vigente_hasta: null,
              observacion: null,
            },
          ],
        },
        isPending: false,
        isError: false,
      } as never);

    renderBuilder();

    expect(screen.getAllByText("Desde Bs 20").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Museo de prueba").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute(
      "href",
      "/destinos/atractivo-1?volver=%2Fdestinos%3Fvista%3Darmar",
    );
  });
});
