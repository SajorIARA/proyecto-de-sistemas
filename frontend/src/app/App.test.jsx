import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el título del sistema", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Turismo Melgarejo/i })).toBeInTheDocument();
  });

  it("renderiza el componente de estado del backend", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
      })
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend conectado");
    });
  });
});