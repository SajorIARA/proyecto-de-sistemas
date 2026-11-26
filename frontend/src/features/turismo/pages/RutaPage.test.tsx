import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RutaProvider, useRuta } from "../context/RutaContext";
import { RutaPage } from "./RutaPage";
import type { Atractivo } from "../../../types/turismo";
import { AuthProvider } from "../../auth/context/AuthContext";

const destino: Atractivo = {
  id: "11111111-1111-1111-1111-111111111111",
  nombre: "Mirador Killi Killi",
  descripcion: "Vista panorámica de La Paz.",
  direccion: "Av. Sucre",
  duracion_minutos: 45,
  ubicacion: null,
  area: null,
  categorias: ["Miradores"],
  fuente_origen: "INSTITUCIONAL",
  activo: true,
  fecha_creacion: "2026-01-01T00:00:00Z",
  fecha_actualizacion: "2026-01-01T00:00:00Z",
};

function RutaConDestino() {
  const { alternar, guardarRuta } = useRuta();
  return (
    <>
      <button type="button" onClick={() => alternar(destino)}>
        Añadir destino
      </button>
      <button type="button" onClick={guardarRuta}>
        Guardar ruta
      </button>
      <RutaPage />
    </>
  );
}

describe("RutaPage", () => {
  it("explica cómo añadir destinos cuando la ruta está vacía", () => {
    render(
      <MemoryRouter>
        <AuthProvider><RutaProvider><RutaPage /></RutaProvider></AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /tu ruta aún está vacía/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explorar destinos/i })).toHaveAttribute(
      "href",
      "/destinos",
    );
  });

  it("muestra y permite quitar un destino de la ruta", () => {
    render(
      <MemoryRouter>
        <AuthProvider><RutaProvider><RutaConDestino /></RutaProvider></AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /añadir destino/i }));
    expect(screen.getAllByText("Mirador Killi Killi")).not.toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /^quitar$/i }));
    expect(screen.getByRole("heading", { name: /tu ruta aún está vacía/i })).toBeInTheDocument();
  });

  it("muestra la ruta guardada en el selector", () => {
    render(
      <MemoryRouter>
        <AuthProvider><RutaProvider><RutaConDestino /></RutaProvider></AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /añadir destino/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar ruta/i }));

    expect(screen.getByRole("button", { name: /mi ruta.*1 destino/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
