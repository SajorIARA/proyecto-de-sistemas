import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el título y el estado online cuando el health check responde", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
      })
    );

    render(<App />);
    expect(screen.getByRole("heading", { name: /Turismo Melgarejo/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend conectado");
    });
  });

  it("muestra backend sin conexión cuando el health check falla", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend sin conexión");
    });
  });
});