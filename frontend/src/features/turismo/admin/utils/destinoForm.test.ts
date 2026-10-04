import { describe, expect, it } from "vitest";

import {
  alternarCategoria,
  esFormularioValido,
  filtrarDestinos,
  VALORES_INICIALES,
  validarFormulario,
  valoresDesdeDestino,
} from "./destinoForm";
import type { AtractivoAdmin, DestinoFormValues } from "../../../../types/turismo";

/** Formulario completo y válido, para partir de él en cada prueba. */
function completo(overrides: Partial<DestinoFormValues> = {}): DestinoFormValues {
  return {
    ...VALORES_INICIALES,
    nombre: "Valle de la Luna",
    descripcion: "Formaciones de arcilla en la Tzijina del altiplano.",
    longitud: "-68.1375",
    latitud: "-16.4961",
    ...overrides,
  };
}

function destino(overrides: Partial<AtractivoAdmin> = {}): AtractivoAdmin {
  return {
    id_atractivo: "a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
    nombre: "Valle de la Luna",
    descripcion: "Formaciones de arcilla.",
    direccion: null,
    duracion_minutos: 90,
    ubicacion: { longitud: -68.1375, latitud: -16.4961 },
    area: null,
    categorias: [5],
    fuente_origen: "INSTITUCIONAL",
    activo: true,
    fecha_creacion: "2026-10-03T18:14:30.495391-04:00",
    fecha_actualizacion: "2026-10-03T18:14:30.495398-04:00",
    ...overrides,
  };
}

describe("validarFormulario", () => {
  it("acepta un formulario completo", () => {
    expect(validarFormulario(completo())).toEqual({});
    expect(esFormularioValido(completo())).toBe(true);
  });

  it("exige nombre y descripción", () => {
    const errores = validarFormulario(completo({ nombre: "  ", descripcion: "" }));

    expect(errores.nombre).toHaveLength(1);
    expect(errores.descripcion).toHaveLength(1);
  });

  /**
   * Este es el motivo de existir de la validación en el frontend:
   * `AtractivoAdminSerializer` no declara `min_value` para
   * `duracion_minutos`, así que un 0 llega a Postgres, viola el CHECK
   * `duracion_minutos > 0` y Django responde 500 en vez de 400.
   */
  it("rechaza una duración de 0 o negativa antes de que llegue al backend", () => {
    expect(validarFormulario(completo({ duracionMinutos: "0" })).duracionMinutos)
      .toBeDefined();
    expect(
      validarFormulario(completo({ duracionMinutos: "-30" })).duracionMinutos,
    ).toBeDefined();
    expect(
      validarFormulario(completo({ duracionMinutos: "cero" })).duracionMinutos,
    ).toBeDefined();
  });

  it("acepta la duración vacía como 'sin duración'", () => {
    expect(validarFormulario(completo({ duracionMinutos: "" })).duracionMinutos)
      .toBeUndefined();
  });

  it("exige coordenadas y valida sus rangos", () => {
    expect(validarFormulario(completo({ longitud: "" })).longitud).toBeDefined();
    expect(validarFormulario(completo({ latitud: "" })).latitud).toBeDefined();

    // El backend acepta ±180 en longitud y ±90 en latitud.
    expect(validarFormulario(completo({ longitud: "181" })).longitud).toBeDefined();
    expect(validarFormulario(completo({ latitud: "-91" })).latitud).toBeDefined();

    expect(validarFormulario(completo({ longitud: "-180" })).longitud).toBeUndefined();
    expect(validarFormulario(completo({ latitud: "90" })).latitud).toBeUndefined();
  });

  it("acepta coma decimal en las coordenadas", () => {
    // Un usuario Boliviano puede escribir "-16,4961".
    const valores = completo({ longitud: "-68,1375", latitud: "-16,4961" });

    expect(validarFormulario(valores)).toEqual({});
  });

  it("avisa cuando el nombre supera los 200 caracteres del modelo", () => {
    const errores = validarFormulario(completo({ nombre: "a".repeat(201) }));

    expect(errores.nombre?.[0]).toContain("200");
  });
});

describe("valoresDesdeDestino", () => {
  it("mapea los campos del backend a los del formulario", () => {
    const valores = valoresDesdeDestino(destino());

    expect(valores.nombre).toBe("Valle de la Luna");
    expect(valores.duracionMinutos).toBe("90");
    expect(valores.longitud).toBe("-68.1375");
    expect(valores.latitud).toBe("-16.4961");
    expect(valores.categorias).toEqual([5]);
    expect(valores.activo).toBe(true);
  });

  it("deja en texto vacío lo que el backend trae en null", () => {
    const valores = valoresDesdeDestino(
      destino({ duracion_minutos: null, direccion: null, ubicacion: null }),
    );

    expect(valores.duracionMinutos).toBe("");
    expect(valores.direccion).toBe("");
    expect(valores.longitud).toBe("");
    expect(valores.latitud).toBe("");
  });

  it("copia el array de categorías en vez de compartirlo", () => {
    const original = destino();
    const valores = valoresDesdeDestino(original);

    valores.categorias.push(99);

    expect(original.categorias).toEqual([5]);
  });

  it("el destino que vuelve del backend pasa su propia validación", () => {
    expect(esFormularioValido(valoresDesdeDestino(destino()))).toBe(true);
  });
});

describe("alternarCategoria", () => {
  it("agrega y quita sin mutar el array original", () => {
    const original: number[] = [1];

    const conDos = alternarCategoria(original, 3);
    expect(conDos).toEqual([1, 3]);
    expect(original).toEqual([1]);

    expect(alternarCategoria(conDos, 3)).toEqual([1]);
  });
});

describe("filtrarDestinos", () => {
  const activos = destino({ id_atractivo: "1", nombre: "Isla del Sol" });
  const dadosDeBaja = destino({
    id_atractivo: "2",
    nombre: "Toro Norte",
    activo: false,
  });

  it("muestra solo los activos por defecto", () => {
    const resultado = filtrarDestinos([activos, dadosDeBaja], {
      estado: "activos",
      texto: "",
    });

    expect(resultado.map((d) => d.id_atractivo)).toEqual(["1"]);
  });

  it("muestra solo los dados de baja", () => {
    const resultado = filtrarDestinos([activos, dadosDeBaja], {
      estado: "inactivos",
      texto: "",
    });

    expect(resultado.map((d) => d.id_atractivo)).toEqual(["2"]);
  });

  it("busca por nombre, descripción y dirección sin distinguir mayúsculas", () => {
    expect(
      filtrarDestinos([activos, dadosDeBaja], {
        estado: "todos",
        texto: "isla",
      }).map((d) => d.id_atractivo),
    ).toEqual(["1"]);

    expect(
      filtrarDestinos([activos, dadosDeBaja], {
        estado: "todos",
        texto: "ARCILLA",
      }).map((d) => d.id_atractivo),
    ).toEqual(["1", "2"]);

    expect(
      filtrarDestinos(
        [destino({ direccion: "Zona Sur" })],
        { estado: "todos", texto: "zona sur" },
      ),
    ).toHaveLength(1);
  });

  it("combina estado y búsqueda", () => {
    expect(
      filtrarDestinos([activos, dadosDeBaja], {
        estado: "activos",
        texto: "toro",
      }),
    ).toHaveLength(0);
  });
});