import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retrasa la propagación hasta que se cumple el tiempo", () => {
    const { result, rerender } = renderHook(
      ({ valor }) => useDebouncedValue(valor, 300),
      { initialProps: { valor: "a" } },
    );

    expect(result.current).toBe("a");

    rerender({ valor: "ab" });

    // Todavía dentro de la ventana: conserva el valor anterior.
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");
  });

  it("reinicia el temporizador con cada cambio rápido", () => {
    const { result, rerender } = renderHook(
      ({ valor }) => useDebouncedValue(valor, 300),
      { initialProps: { valor: "" } },
    );

    rerender({ valor: "m" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ valor: "mu" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ valor: "mus" });

    // Los 200 ms previos no alcanzaron: sigue vacío.
    expect(result.current).toBe("");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("mus");
  });
});
