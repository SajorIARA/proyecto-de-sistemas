import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ data: { status: "ok" } }),
}));

vi.mock("../../api/http", () => ({
  api: {
    get: (...args) => mocks.get(...args),
  },
}));

import BackendStatus from "./BackendStatus";

describe("BackendStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("muestra online cuando el health check responde", async () => {
    mocks.get.mockResolvedValue({ data: { status: "ok" } });

    render(<BackendStatus />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend conectado");
    });
    expect(mocks.get).toHaveBeenCalledWith("/health/");
  });

  it("muestra offline cuando el health check falla", async () => {
    mocks.get.mockRejectedValue(new Error("Failed to fetch"));

    render(<BackendStatus />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend sin conexión");
    });
  });
});
