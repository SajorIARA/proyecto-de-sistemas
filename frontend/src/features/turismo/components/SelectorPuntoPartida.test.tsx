import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SelectorPuntoPartida } from "./SelectorPuntoPartida";

const geolocalizacion = vi.hoisted(() => ({
  coords: null as { latitude: number; longitude: number } | null,
  loading: false,
  error: null as string | null,
  errorMessage: null as string | null,
  getCurrentPosition: vi.fn(),
  reset: vi.fn(),
}));

const mapa = vi.hoisted(() => ({
  alHacerClic: null as
    | ((evento: { latlng: { lat: number; lng: number } }) => void)
    | null,
}));

vi.mock("../../../hooks/useGeolocation", () => ({
  useGeolocation: () => geolocalizacion,
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mini-mapa">{children}</div>
  ),
  TileLayer: () => null,
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  CircleMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMapEvents: (manejadores: {
    click: (evento: { latlng: { lat: number; lng: number } }) => void;
  }) => {
    mapa.alHacerClic = manejadores.click;
    return null;
  },
}));

describe("SelectorPuntoPartida", () => {
  beforeEach(() => {
    geolocalizacion.coords = null;
    geolocalizacion.loading = false;
    geolocalizacion.error = null;
    geolocalizacion.errorMessage = null;
    geolocalizacion.getCurrentPosition = vi.fn();
    geolocalizacion.reset = vi.fn();
    mapa.alHacerClic = null;
  });

  it("ofrece la ubicación actual y el marcado en el mapa", () => {
    render(<SelectorPuntoPartida origen={null} onCambiar={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Usar mi ubicación" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Marcar en el mapa" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("mini-mapa")).not.toBeInTheDocument();
  });

  it("usa la ubicación actual cuando el navegador la entrega", () => {
    geolocalizacion.coords = { latitude: -16.51, longitude: -68.14 };
    const onCambiar = vi.fn();

    render(<SelectorPuntoPartida origen={null} onCambiar={onCambiar} />);

    expect(onCambiar).toHaveBeenCalledWith({
      latitud: -16.51,
      longitud: -68.14,
      tipo: "gps",
    });
    expect(geolocalizacion.reset).toHaveBeenCalled();
  });

  it("aviso claro si el permiso de geolocalización falla", () => {
    geolocalizacion.error = "permission-denied";
    geolocalizacion.errorMessage = "Permiso denegado para acceder a tu ubicación.";
    const onCambiar = vi.fn();

    render(<SelectorPuntoPartida origen={null} onCambiar={onCambiar} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Permiso denegado");
    expect(onCambiar).not.toHaveBeenCalled();
  });

  it("rechaza una ubicación actual fuera del área de La Paz", () => {
    geolocalizacion.coords = { latitude: -17.5, longitude: -68.14 };
    const onCambiar = vi.fn();

    render(<SelectorPuntoPartida origen={null} onCambiar={onCambiar} />);

    expect(screen.getByRole("alert")).toHaveTextContent("fuera del área de La Paz");
    expect(onCambiar).not.toHaveBeenCalled();
  });

  it("fija el origen con un clic en el mapa", () => {
    const onCambiar = vi.fn();
    render(<SelectorPuntoPartida origen={null} onCambiar={onCambiar} />);

    fireEvent.click(screen.getByRole("button", { name: "Marcar en el mapa" }));
    expect(screen.getByTestId("mini-mapa")).toBeInTheDocument();
    expect(mapa.alHacerClic).not.toBeNull();

    act(() => {
      mapa.alHacerClic?.({ latlng: { lat: -16.52, lng: -68.12 } });
    });

    expect(onCambiar).toHaveBeenCalledWith({
      latitud: -16.52,
      longitud: -68.12,
      tipo: "mapa",
    });
  });

  it("no acepta un punto del mapa fuera del área", () => {
    const onCambiar = vi.fn();
    render(<SelectorPuntoPartida origen={null} onCambiar={onCambiar} />);

    fireEvent.click(screen.getByRole("button", { name: "Marcar en el mapa" }));
    act(() => {
      mapa.alHacerClic?.({ latlng: { lat: -16.1, lng: -68.12 } });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El punto debe estar dentro del área de La Paz",
    );
    expect(onCambiar).not.toHaveBeenCalled();
  });

  it("permite quitar el origen elegido", () => {
    const onCambiar = vi.fn();
    render(
      <SelectorPuntoPartida
        origen={{ latitud: -16.5, longitud: -68.13, tipo: "gps" }}
        onCambiar={onCambiar}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Ubicación actual");
    fireEvent.click(screen.getByRole("button", { name: "Quitar punto de partida" }));
    expect(onCambiar).toHaveBeenCalledWith(null);
  });
});
