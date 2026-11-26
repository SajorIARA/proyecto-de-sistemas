import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapaRuta } from "./MapaRuta";
import type { Atractivo } from "../../../types/turismo";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("../../../api/http", () => ({ api: { post: mocks.post } }));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  CircleMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Polyline: () => null,
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));

const parada: Atractivo = {
  id: "destino-1",
  nombre: "Museo Uno",
  descripcion: "Colección local.",
  direccion: "Centro",
  duracion_minutos: 60,
  ubicacion: { longitud: -68.14, latitud: -16.5 },
  area: null,
  categorias: ["Cultura"],
  fuente_origen: "test",
  activo: true,
  fecha_creacion: "2026-01-01",
  fecha_actualizacion: "2026-01-01",
};

describe("MapaRuta", () => {
  beforeEach(() => {
    mocks.post.mockReset();
  });

  it("rutea desde el punto de partida elegido, incluso con una sola parada", async () => {
    mocks.post.mockResolvedValue({
      data: {
        origen: "driving",
        distancia_km: 2,
        duracion_minutos: 8,
        trazado: [
          [-16.49, -68.13],
          [-16.5, -68.14],
        ],
      },
    });
    const onRuteo = vi.fn();

    render(
      <MapaRuta
        destinos={[parada]}
        paradas={[parada]}
        seleccionadoId={null}
        onSeleccionar={vi.fn()}
        origen={{ latitud: -16.49, longitud: -68.13, tipo: "mapa" }}
        onRuteo={onRuteo}
      />,
    );

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/turismo/ruteo/",
        {
          puntos: [
            { latitud: -16.49, longitud: -68.13 },
            { latitud: -16.5, longitud: -68.14 },
          ],
        },
        expect.anything(),
      ),
    );
    expect(await screen.findByText(/Ruta por calles · 2 km · 8 min/)).toBeInTheDocument();
    expect(onRuteo).toHaveBeenCalledWith(
      expect.objectContaining({ distancia_km: 2, duracion_minutos: 8 }),
    );
  });

  it("no muestra minutos inventados cuando falla el ruteo", async () => {
    mocks.post.mockRejectedValue(new Error("OSRM caído"));
    const onRuteo = vi.fn();

    render(
      <MapaRuta
        destinos={[parada]}
        paradas={[parada]}
        seleccionadoId={null}
        onSeleccionar={vi.fn()}
        origen={{ latitud: -16.49, longitud: -68.13, tipo: "gps" }}
        onRuteo={onRuteo}
      />,
    );

    await waitFor(() => expect(mocks.post).toHaveBeenCalled());
    expect(
      await screen.findByText("Trazado aproximado (línea recta)"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Ruta por calles/)).not.toBeInTheDocument();
    expect(onRuteo).toHaveBeenCalledWith(null);
  });
});
