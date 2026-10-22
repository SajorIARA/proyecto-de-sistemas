/**
 * Pruebas de `tokenStorage`: único punto de lectura/escritura de los tokens
 * y del usuario en `localStorage`. Cubre el caso del JSON corrupto, que es
 * el que protege contra un usuario editando el storage a mano.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { tokenStorage } from "./tokenStorage";

const CLAVE_USUARIO = "turismo_auth_user";

describe("tokenStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("almacena y recupera access y refresh", () => {
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();

    tokenStorage.setTokens("acc-1", "ref-1");

    expect(tokenStorage.getAccess()).toBe("acc-1");
    expect(tokenStorage.getRefresh()).toBe("ref-1");
  });

  it("setAccess solo pisa el access (tras un refresh)", () => {
    tokenStorage.setTokens("acc-viejo", "ref-1");

    tokenStorage.setAccess("acc-nuevo");

    expect(tokenStorage.getAccess()).toBe("acc-nuevo");
    expect(tokenStorage.getRefresh()).toBe("ref-1");
  });

  it("serializa y recupera el usuario", () => {
    const usuario = { email: "ana@turismo.bo", roles: ["ADMIN"] };

    tokenStorage.setUser(usuario);

    expect(tokenStorage.getUser()).toEqual(usuario);
  });

  it("devuelve null cuando no hay usuario guardado", () => {
    expect(tokenStorage.getUser()).toBeNull();
  });

  it("descarta un usuario corrupto y elimina la clave", () => {
    localStorage.setItem(CLAVE_USUARIO, "{no-es-json");

    expect(tokenStorage.getUser()).toBeNull();
    expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
  });

  it("clear borra las tres claves y conserva el resto del storage", () => {
    localStorage.setItem("clave_ajena", "no-me-toques");
    tokenStorage.setTokens("acc-1", "ref-1");
    tokenStorage.setUser({ email: "ana@turismo.bo" });

    tokenStorage.clear();

    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(tokenStorage.getUser()).toBeNull();
    expect(localStorage.getItem("clave_ajena")).toBe("no-me-toques");
  });
});
