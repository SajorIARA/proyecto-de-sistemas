import { describe, expect, it } from "vitest";

import { evaluarContrasena } from "./password";

const USUARIO = { nombre: "Jordan", email: "jordan@example.com" };

describe("evaluarContrasena", () => {
  it("acepta una contraseña que cumple las reglas del backend", () => {
    const evaluacion = evaluarContrasena("secreto123", USUARIO);

    expect(evaluacion.errores).toEqual([]);
    expect(evaluacion.requisitos.every((r) => r.cumple)).toBe(true);
  });

  it("exige al menos 8 caracteres", () => {
    const evaluacion = evaluarContrasena("corta", USUARIO);

    expect(evaluacion.errores).toContain("Usa al menos 8 caracteres.");
    expect(
      evaluacion.requisitos.find((r) => r.id === "longitud")?.cumple,
    ).toBe(false);
  });

  it("rechaza contraseñas solo numéricas", () => {
    const evaluacion = evaluarContrasena("87654321", USUARIO);

    expect(evaluacion.errores).toContain(
      "La contraseña no puede ser solo números.",
    );
  });

  it("rechaza contraseñas comunes de la lista de Django", () => {
    const evaluacion = evaluarContrasena("password", USUARIO);

    expect(evaluacion.errores).toContain(
      "Elige una contraseña menos común.",
    );
  });

  it("rechaza contraseñas que contienen el nombre o el correo", () => {
    expect(
      evaluarContrasena("jordan2026", USUARIO).errores,
    ).toContain(
      "La contraseña no puede parecerse a tu nombre o correo.",
    );

    expect(
      evaluarContrasena("jordan@example.com1", USUARIO).errores,
    ).toContain(
      "La contraseña no puede parecerse a tu nombre o correo.",
    );
  });

  it("sube el puntaje al combinar mayúsculas, números y símbolos", () => {
    const debil = evaluarContrasena("aaaaaaaa", USUARIO);
    const fuerte = evaluarContrasena("Andes-2026!", USUARIO);

    expect(fuerte.puntaje).toBeGreaterThan(debil.puntaje);
  });
});
