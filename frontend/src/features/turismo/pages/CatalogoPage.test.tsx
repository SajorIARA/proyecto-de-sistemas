import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/context/AuthContext";
import { TurismoApiError, listarAtractivos } from "../api/turismoApi";
import { CatalogoPage } from "./CatalogoPage";
import type { Atractivo, Paginado } from "../../../types/turismo";

vi.mock("../api/turismoApi", async () => {
  const real = await vi.importActual<typeof import("../api/turismoApi")>(
    "../api/turismoApi",
  );

  return {
    ...real,
    listarAtractivos: vi.fn(),
    obtenerAtractivo: vi.fn(),
    listarCategorias: vi.fn(),
    listarHorariosDe: vi.fn(),
    listarTarifasDe: vi.fn(),
    listarFacetas: vi.fn(),
  };
});

function atractivo(overrides: Partial<Atractivo> = {}): Atractivo {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    nombre: "Plaza Murillo",
    descripcion: "Plaza principal de la ciudad, sede del poder político.",
    direccion: "Calle Comercio y Ayacucho",
    duracion_minutos: 45,
    ubicacion: { longitud: -68.1375, latitud: -16.4961 },
    area: null,
    categorias: ["Cultura"],
    fuente_origen: "INSTITUCIONAL",
    activo: true,
    fecha_creacion: "2026-01-01T00:00:00Z",
    fecha_actualizacion: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function pagina(
  results: Atractivo[],
  extra: Partial<Paginado<Atractivo>> = {},
): Paginado<Atractivo> {
  return { count: results.length, next: null, previous: null, results, ...extra };
}

function cliente() {
  return new QueryClient({
    // retryDelay: 0 evita el backoff por defecto de TanStack Query (1000 ms),
    // que supera el timeout de `findBy*`.
    defaultOptions: {
      queries: { retry: false, gcTime: 0, retryDelay: 0 },
    },
  });
}

function renderCatalogo(ruta = "/destinos") {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <AuthProvider>
          <Routes>
            <Route path="/destinos" element={<CatalogoPage />} />
            <Route path="/destinos/:id" element={<h1>Detalle</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CatalogoPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // jsdom no implementa IntersectionObserver, así que en los tests el
    // scroll infinito no se dispara y solo queda el botón "Cargar más".
    vi.stubGlobal("IntersectionObserver", undefined);
  });

  it("muestra las 6 categorías oficiales más el chip Todos, con Todos activo", async () => {
    vi.mocked(listarAtractivos).mockResolvedValue(pagina([]));

    renderCatalogo();

    const grupo = await screen.findByRole("group", {
      name: /filtrar catálogo por categoría/i,
    });

    const chips = within(grupo).getAllByRole("button");

    // El texto del chip incluye la insignia (emoji), así que se compara
    // solo con las letras para validar el orden del PO.
    const etiquetas = chips.map((chip) =>
      chip.textContent?.replace(/[^\p{L}]/gu, "").trim(),
    );

    expect(etiquetas).toEqual([
      "Todos",
      "Aventura",
      "Gastronomía",
      "Cultura",
      "Miradores",
      "Naturaleza",
      "Arqueología",
    ]);

    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra los skeletons de carga mientras consulta la API", async () => {
    let resuelve: (valor: Paginado<Atractivo>) => void = () => undefined;

    vi.mocked(listarAtractivos).mockReturnValue(
      new Promise((resolve) => {
        resuelve = resolve;
      }),
    );

    renderCatalogo();

    expect(await screen.findByTestId("catalogo-skeletons")).toBeInTheDocument();

    resuelve(pagina([]));
  });

  it("renderiza la card con categoría, nombre, ubicación, descripción y enlace al detalle", async () => {
    vi.mocked(listarAtractivos).mockResolvedValue(
      pagina([
        atractivo({
          nombre: "Basílica de San Francisco",
          direccion: "Plaza San Francisco",
          descripcion: "Iglesia y museo religioso colonial en pleno centro.",
          categorias: ["Cultura"],
        }),
      ]),
    );

    renderCatalogo();

    const encabezado = await screen.findByRole("heading", {
      name: "Basílica de San Francisco",
    });
    const card = encabezado.closest("article") as HTMLElement;

    expect(card).not.toBeNull();
    expect(within(card).getByText("Cultura")).toBeInTheDocument();
    expect(within(card).getByText("Plaza San Francisco")).toBeInTheDocument();
    expect(
      within(card).getByText("Iglesia y museo religioso colonial en pleno centro."),
    ).toBeInTheDocument();
    expect(
      within(card).getByTestId("destino-imagen-placeholder"),
    ).toBeInTheDocument();

    expect(within(card).getByRole("link", { name: /ver detalle/i })).toHaveAttribute(
      "href",
      "/destinos/11111111-1111-1111-1111-111111111111",
    );
  });

  it("no envía filtro con el chip Todos y sí al elegir una categoría", async () => {
    vi.mocked(listarAtractivos).mockResolvedValue(pagina([]));

    renderCatalogo();

    await screen.findByTestId("catalogo-vacio");

    expect(vi.mocked(listarAtractivos).mock.calls[0][0]?.categoria).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /naturaleza/i }));

    await waitFor(() => {
      expect(
        vi.mocked(listarAtractivos).mock.calls.at(-1)?.[0]?.categoria,
      ).toBe("Naturaleza");
    });
  });

  it("muestra el mensaje pedido por el PO cuando la categoría no tiene destinos", async () => {
    vi.mocked(listarAtractivos).mockResolvedValue(pagina([]));

    renderCatalogo("/destinos?categoria=Aventura");

    expect(
      await screen.findByText(
        "No encontramos atractivos turísticos disponibles en esta categoría.",
      ),
    ).toBeInTheDocument();

    expect(vi.mocked(listarAtractivos).mock.calls[0][0]?.categoria).toBe("Aventura");
  });

  it("ofrece limpiar el filtro desde el estado vacío", async () => {
    vi.mocked(listarAtractivos).mockResolvedValue(pagina([]));

    renderCatalogo("/destinos?categoria=Arqueología");

    fireEvent.click(
      await screen.findByRole("button", { name: /ver todos los destinos/i }),
    );

    await waitFor(() => {
      expect(
        vi.mocked(listarAtractivos).mock.calls.at(-1)?.[0]?.categoria,
      ).toBeNull();
    });
  });

  it("carga la página siguiente con el botón Cargar más", async () => {
    vi.mocked(listarAtractivos)
      .mockResolvedValueOnce(
        pagina([atractivo({ id: "a1", nombre: "Valle de la Luna" })], {
          count: 2,
          next: "http://localhost/api/turismo/atractivos/?page=2",
        }),
      )
      .mockResolvedValueOnce(
        pagina([atractivo({ id: "a2", nombre: "Valle de las Ánimas" })], {
          count: 2,
          next: null,
        }),
      );

    renderCatalogo();

    fireEvent.click(
      await screen.findByRole("button", { name: /cargar más destinos/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Valle de las Ánimas" }),
    ).toBeInTheDocument();

    expect(vi.mocked(listarAtractivos)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(listarAtractivos).mock.calls[1][0]?.page).toBe(2);
  });

  it("muestra un error reintentable cuando la API falla", async () => {
    vi.mocked(listarAtractivos).mockRejectedValue(
      new TurismoApiError("Fallo de red", 0),
    );

    renderCatalogo();

    const alerta = await screen.findByRole("alert");

    expect(alerta).toHaveTextContent(/no pudimos cargar el catálogo/i);

    vi.mocked(listarAtractivos).mockResolvedValue(pagina([]));

    fireEvent.click(within(alerta).getByRole("button", { name: /reintentar/i }));

    await waitFor(() => {
      expect(vi.mocked(listarAtractivos)).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByTestId("catalogo-vacio")).toBeInTheDocument();
  });
});
