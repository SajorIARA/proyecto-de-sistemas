import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("desplaza a una sección cuando cambia únicamente el hash", async () => {
    const scrollIntoView = vi.fn();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              path="/"
              element={
                <>
                  <Link to="/#experiencias">Experiencias</Link>
                  <section id="experiencias">Contenido de experiencias</section>
                </>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Experiencias" }));

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "instant",
        block: "start",
      });
    });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
