import { describe, expect, it } from "vitest";

import {
  aImportacionesAdminError,
  ImportacionesAdminApiError,
} from "./importacionesAdminApi";

function errorAxios(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("aImportacionesAdminError", () => {
  it("traduce errores de validación por campo", () => {
    const error = aImportacionesAdminError(
      errorAxios(400, {
        consulta: ["La búsqueda debe tener entre 3 y 120 caracteres."],
        limite: ["El límite debe estar entre 1 y 50."],
      }),
      "falló",
    );

    expect(error).toBeInstanceOf(ImportacionesAdminApiError);
    expect(error.status).toBe(400);
    expect(error.mensajesDe("consulta")).toEqual([
      "La búsqueda debe tener entre 3 y 120 caracteres.",
    ]);
    expect(error.mensajesDe("limite")).toEqual([
      "El límite debe estar entre 1 y 50.",
    ]);
    expect(error.message).toContain("entre 3 y 120");
  });

  it("respeta el detail del backend para un 403", () => {
    const error = aImportacionesAdminError(
      errorAxios(403, { detail: "No tiene permiso para realizar esta acción." }),
      "falló",
    );

    expect(error.status).toBe(403);
    expect(error.esNoAutorizado).toBe(true);
    expect(error.message).toBe("No tiene permiso para realizar esta acción.");
  });

  it("usa el mensaje por defecto si el error no viene del backend", () => {
    const error = aImportacionesAdminError(new Error("sin red"), "por defecto");
    expect(error.message).toBe("sin red");
    expect(error.status).toBe(0);
    expect(error.mensajesDe("consulta")).toEqual([]);
  });
});
