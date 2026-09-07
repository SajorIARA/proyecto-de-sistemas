import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el título de la aplicación", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Turismo Melgarejo/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Backend conectado")).toBeInTheDocument();
    });
  });

  it("muestra backend online cuando el health check responde", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Backend conectado")).toBeInTheDocument();
    });
  });
});
