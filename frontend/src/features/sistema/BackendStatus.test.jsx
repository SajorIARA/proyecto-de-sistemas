import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BackendStatus from "./BackendStatus";

describe("BackendStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra online cuando el health check responde", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
      })
    );

    render(<BackendStatus />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend conectado");
    });
  });

  it("muestra offline cuando el health check falla", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    render(<BackendStatus />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Backend sin conexión");
    });
  });
});