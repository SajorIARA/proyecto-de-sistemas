import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ data: { status: "ok" } }),
}));

vi.mock("../api/http", () => ({
  api: {
    get: (...args) => mocks.get(...args),
  },
}));

import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("muestra el título del sistema", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Turismo Melgarejo/i })).toBeInTheDocument();
  });

  it("renderiza el componente de estado del backend", async () => {
    mocks.get.mockResolvedValue({ data: { status: "ok" } });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend conectado");
    });
  });
});