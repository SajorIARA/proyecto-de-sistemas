/**
 * Pruebas del carrusel de imágenes.
 *
 * Es un componente puro sobre URLs: acá se verifica el respaldo sin fotos, la
 * imagen única, el avance automático (con relojes falsos) y el descarte de
 * imágenes rotas. El origen de las URLs (`imagenesDe`) se prueba aparte.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CarruselImagenes } from "./CarruselImagenes";

const URLS = [
  "https://res.cloudinary.com/x/a.jpg",
  "https://res.cloudinary.com/x/b.jpg",
  "https://res.cloudinary.com/x/c.jpg",
];

afterEach(() => {
  vi.useRealTimers();
});

describe("CarruselImagenes", () => {
  it("sin imágenes muestra el respaldo", () => {
    render(
      <CarruselImagenes
        imagenes={[]}
        alt="Destino"
        fallback={<span>Sin fotografías</span>}
      />,
    );

    expect(screen.getByText("Sin fotografías")).toBeInTheDocument();
    expect(screen.queryByTestId("carrusel-destino")).not.toBeInTheDocument();
  });

  it("con una sola imagen muestra una sola y sin puntos", () => {
    const { container } = render(
      <CarruselImagenes imagenes={[URLS[0]]} alt="Destino único" />,
    );

    const imagenes = container.querySelectorAll("img");

    expect(imagenes).toHaveLength(1);
    expect(imagenes[0]).toHaveAttribute("alt", "Destino único");
    // Sin puntos indicadores cuando no hay nada que alternar.
    expect(screen.getByTestId("carrusel-destino").querySelectorAll("span"))
      .toHaveLength(0);
  });

  it("alterna las imágenes con el paso del tiempo", () => {
    vi.useFakeTimers();

    const { container } = render(
      <CarruselImagenes imagenes={URLS} alt="Destino" intervaloMs={1000} />,
    );

    const imagenes = container.querySelectorAll("img");

    expect(imagenes).toHaveLength(3);
    expect(imagenes[0]).toHaveClass("opacity-100");
    expect(imagenes[1]).toHaveClass("opacity-0");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(imagenes[0]).toHaveClass("opacity-0");
    expect(imagenes[1]).toHaveClass("opacity-100");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(imagenes[2]).toHaveClass("opacity-100");
    expect(imagenes[0]).toHaveClass("opacity-0");
  });

  it("descarta las imágenes que fallan y cae al respaldo si fallan todas", () => {
    const { container } = render(
      <CarruselImagenes
        imagenes={URLS.slice(0, 2)}
        alt="Destino"
        fallback={<span>Marcador de marca</span>}
      />,
    );

    expect(container.querySelectorAll("img")).toHaveLength(2);

    fireEvent.error(container.querySelectorAll("img")[0]);
    expect(container.querySelectorAll("img")).toHaveLength(1);

    fireEvent.error(container.querySelectorAll("img")[0]);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getByText("Marcador de marca")).toBeInTheDocument();
  });
});
