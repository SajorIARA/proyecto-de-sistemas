import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PREFERENCIAS_DRAFT_KEY } from "../../../config/preferencias";
import { PreferenciasProvider, usePreferencias } from "./PreferenciasContext";

function Sonda() {
  const { borrador, hayBorrador, guardadoEn, actualizar, descartar } =
    usePreferencias();

  return (
    <div>
      <span data-testid="categorias">{borrador.categorias.join(",")}</span>
      <span data-testid="presupuesto">{borrador.presupuestoBob}</span>
      <span data-testid="unidad">{borrador.duracionUnidad}</span>
      <span data-testid="hay">{String(hayBorrador)}</span>
      <span data-testid="guardado">{guardadoEn === null ? "no" : "si"}</span>

      <button type="button" onClick={() => actualizar({ presupuestoBob: 1234 })}>
        cambiar
      </button>
      <button type="button" onClick={descartar}>
        descartar
      </button>
    </div>
  );
}

function renderContexto() {
  return render(
    <PreferenciasProvider>
      <Sonda />
    </PreferenciasProvider>,
  );
}

describe("PreferenciasProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("arranca con el borrador neutro cuando no hay nada guardado", () => {
    renderContexto();

    expect(screen.getByTestId("categorias")).toHaveTextContent("");
    expect(screen.getByTestId("hay")).toHaveTextContent("false");
    expect(screen.getByTestId("guardado")).toHaveTextContent("no");
  });

  it("recupera un borrador persistido (sincronización con el estado global)", () => {
    localStorage.setItem(
      PREFERENCIAS_DRAFT_KEY,
      JSON.stringify({
        categorias: [3, 3, 8],
        presupuestoBob: 700,
        duracionValor: 2,
        duracionUnidad: "dias",
        latitud: "-16.5",
        longitud: "-68.15",
      }),
    );

    renderContexto();

    // El `[3, 3, 8]` se sanea a ids enteros sin duplicar en la selección.
    expect(screen.getByTestId("categorias")).toHaveTextContent("3,8");
    expect(screen.getByTestId("presupuesto")).toHaveTextContent("700");
    expect(screen.getByTestId("unidad")).toHaveTextContent("dias");
    expect(screen.getByTestId("hay")).toHaveTextContent("true");
  });

  it("persiste los cambios tras el debounce y los descarta a pedido", () => {
    renderContexto();

    fireEvent.click(screen.getByText("cambiar"));

    act(() => {
      vi.advanceTimersByTime(400);
    });

    const guardado = JSON.parse(
      localStorage.getItem(PREFERENCIAS_DRAFT_KEY) ?? "{}",
    );

    expect(guardado.presupuestoBob).toBe(1234);
    expect(screen.getByTestId("hay")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("descartar"));

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(localStorage.getItem(PREFERENCIAS_DRAFT_KEY)).toBeNull();
    expect(screen.getByTestId("hay")).toHaveTextContent("false");
    expect(screen.getByTestId("presupuesto")).toHaveTextContent("500");
  });

  it("ignora un borrador corrupto", () => {
    localStorage.setItem(PREFERENCIAS_DRAFT_KEY, "{no-es-json");

    renderContexto();

    expect(screen.getByTestId("hay")).toHaveTextContent("false");
  });
});
