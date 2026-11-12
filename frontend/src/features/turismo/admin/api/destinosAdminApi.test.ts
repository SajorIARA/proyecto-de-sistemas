/**
 * Pruebas de la capa de escritura del CRUD de destinos.
 *
 * Se concentran en las dos conversiones que son responsabilidad del frontend y
 * de las que depende el resto de la UI: `aPayload` (que sanea lo que el
 * backend no sanea) y `aDestinosAdminError` (que traduce los errores de DRF
 * a algo que se pueda pintar bajo cada input).
 */

import { describe, expect, it } from "vitest";

import {
  aDestinosAdminError,
  aPayload,
  DestinosAdminApiError,
} from "./destinosAdminApi";

/** Simula el error de axios: `{response: {status, data}}`. */
function errorAxios(status: number, data: unknown) {
  return { response: { status, data } };
}

const BASE = {
  nombre: "Valle de la Luna",
  descripcion: "Formaciones de arcilla.",
  direccion: "",
  duracionMinutos: "",
  longitud: "-68.1375",
  latitud: "-16.4961",
  categorias: [],
  fuenteOrigen: "INSTITUCIONAL",
  activo: true,
};

describe("aPayload", () => {
  it("mapea los campos del formulario al serializer", () => {
    const payload = aPayload({
      ...BASE,
      direccion: "  Calle Sucre  ",
      duracionMinutos: " 90 ",
      categorias: [5],
    });

    expect(payload).toEqual({
      nombre: "Valle de la Luna",
      descripcion: "Formaciones de arcilla.",
      // El backend espera null, no cadena vacía, para los opcionales.
      direccion: "Calle Sucre",
      duracion_minutos: 90,
      ubicacion: { longitud: -68.1375, latitud: -16.4961 },
      categorias: [5],
      fuente_origen: "INSTITUCIONAL",
      activo: true,
    });
  });

  /**
   * El caso que justifica la sanitización: mandar 0 hace que Postgres rechace
   * el CHECK `duracion_minutos > 0` y Django devuelva 500. Aquí se convierte
   * en `null`, que es el valor que el modelo admite.
   */
  it("nunca envía duracion_minutos = 0 ni negativos", () => {
    expect(aPayload({ ...BASE, duracionMinutos: "0" }).duracion_minutos).toBeNull();
    expect(aPayload({ ...BASE, duracionMinutos: "-5" }).duracion_minutos).toBeNull();
  });

  it("deja la duración en null cuando el campo está vacío", () => {
    expect(aPayload(BASE).duracion_minutos).toBeNull();
  });

  it("redondea la duración a minutos enteros", () => {
    expect(aPayload({ ...BASE, duracionMinutos: "90.7" }).duracion_minutos).toBe(90);
  });

  it("acepta coma decimal en las coordenadas", () => {
    const payload = aPayload({ ...BASE, longitud: "-68,1375", latitud: "-16,4961" });

    expect(payload.ubicacion).toEqual({ longitud: -68.1375, latitud: -16.4961 });
  });

  it("deduplica las categorías", () => {
    expect(aPayload({ ...BASE, categorias: [5, 5, 3] }).categorias).toEqual([5, 3]);
  });

  it("manda true en `activo` para que el destino nazca publicado", () => {
    expect(aPayload(BASE).activo).toBe(true);
  });
});

describe("aDestinosAdminError", () => {
  it("traduce la clave del serializer al campo del formulario", () => {
    // Verificado en vivo: `{"duracion_minutos": ["..."]}`.
    const error = aDestinosAdminError(
      errorAxios(400, { duracion_minutos: ["La duración debe ser mayor a 0."] }),
      "por defecto",
    );

    expect(error).toBeInstanceOf(DestinosAdminApiError);
    expect(error.status).toBe(400);
    expect(error.esValidacion).toBe(true);
    expect(error.mensajesDe("duracionMinutos")).toEqual([
      "La duración debe ser mayor a 0.",
    ]);
  });

  it("mapea `ubicacion` al campo de longitud, que es donde se muestra", () => {
    // Verificado en vivo.
    const error = aDestinosAdminError(
      errorAxios(400, {
        ubicacion: [
          "longitud debe estar en [-180, 180] y latitud en [-90, 90].",
        ],
      }),
      "por defecto",
    );

    expect(error.mensajesDe("longitud")).toHaveLength(1);
    expect(error.mensajesDe("longitud")[0]).toContain("[-180, 180]");
  });

  it("aplana los errores anidados de un campo compuesto", () => {
    const error = aDestinosAdminError(
      errorAxios(400, { ubicacion: { latitud: ["Latitud inválida."] } }),
      "por defecto",
    );

    expect(error.mensajesDe("longitud")).toEqual(["Latitud inválida."]);
  });

  it("acumula varios mensajes del mismo campo", () => {
    const error = aDestinosAdminError(
      errorAxios(400, { nombre: ["Muy largo.", "No permitido."] }),
      "por defecto",
    );

    expect(error.mensajesDe("nombre")).toEqual(["Muy largo.", "No permitido."]);
  });

  it("usa el primer mensaje como mensaje global", () => {
    const error = aDestinosAdminError(
      errorAxios(400, {
        nombre: ["Este campo es requerido."],
        descripcion: ["Este campo es requerido."],
      }),
      "por defecto",
    );

    expect(error.message).toBe("Este campo es requerido.");
  });

  it("cae en `detail` cuando no hay errores por campo", () => {
    const error = aDestinosAdminError(
      errorAxios(403, { detail: "No tenés permiso para esta acción." }),
      "por defecto",
    );

    expect(error.message).toBe("No tenés permiso para esta acción.");
    expect(error.esValidacion).toBe(false);
    expect(error.esNoAutorizado).toBe(true);
  });

  /**
   * El backend corre con `DEBUG=True`, así que un 500 llega como la página de
   * error HTML de Django. Si se intentara parsear, la pantalla explotaría; el
   * cliente la sustituye por un mensaje accionable.
   */
  it("no intenta parsear el HTML de un 500", () => {
    const error = aDestinosAdminError(
      errorAxios(500, "<!DOCTYPE html><html><title>Server Error</title>…"),
      "por defecto",
    );

    expect(error.esErrorServidor).toBe(true);
    expect(error.esValidacion).toBe(false);
    expect(error.message).toBe(
      "El servidor no pudo guardar el cambio. Revisá los datos e intentá de nuevo.",
    );
  });

  it("marca 401 y 403 como no autorizado", () => {
    expect(aDestinosAdminError(errorAxios(401, {}), "x").esNoAutorizado).toBe(true);
    expect(aDestinosAdminError(errorAxios(403, {}), "x").esNoAutorizado).toBe(true);
    expect(aDestinosAdminError(errorAxios(400, {}), "x").esNoAutorizado).toBe(false);
  });

  it("usa el mensaje por defecto cuando la red falla sin respuesta", () => {
    const error = aDestinosAdminError(new Error("Network Error"), "por defecto");

    expect(error.status).toBe(0);
    expect(error.message).toBe("Network Error");
  });

  it("descarta las claves que no son campos del formulario", () => {
    // DRF puede mandar `non_field_errors`; se mapea a un campo real, pero
    // cualquier clave desconocida no debe aparecer como error de un input.
    const error = aDestinosAdminError(
      errorAxios(400, { color_favorito: ["no existe"] }),
      "por defecto",
    );

    expect(error.esValidacion).toBe(false);
    expect(error.message).toBe("por defecto");
  });
});