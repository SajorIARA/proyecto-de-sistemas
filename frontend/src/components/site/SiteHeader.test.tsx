import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../features/auth/context/AuthContext";
import { RutaProvider, useRuta } from "../../features/turismo/context/RutaContext";
import { SiteHeader } from "./SiteHeader";

function ControlRutas() {
  const { crearRuta } = useRuta();

  return (
    <button type="button" onClick={crearRuta}>
      Crear otra ruta
    </button>
  );
}

describe("SiteHeader", () => {
  it("muestra la cantidad de rutas y no la cantidad de destinos", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <RutaProvider>
            <SiteHeader />
            <ControlRutas />
          </RutaProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    const enlaceViaje = screen.getByRole("link", { name: /mi viaje/i });
    expect(enlaceViaje).toHaveTextContent("1");
    expect(enlaceViaje).toHaveTextContent("ruta");
    expect(enlaceViaje).not.toHaveTextContent("destinos");

    fireEvent.click(screen.getByRole("button", { name: "Crear otra ruta" }));

    expect(screen.getByRole("link", { name: /mi viaje/i })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /mi viaje/i })).toHaveTextContent("rutas");
  });
});
