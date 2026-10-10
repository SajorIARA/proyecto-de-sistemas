/**
 * Pruebas de la capa de fotos del panel.
 *
 * Se concentran en las funciones puras que validan antes de tocar la red:
 * clasificar el archivo, rechazar formatos/pesos y normalizar el registro.
 * El flujo de subida en sí (firma, Cloudinary, Celery) se prueba en
 * `GaleriaAdmin.test.tsx` con la capa de red mockeada.
 */

import { describe, expect, it } from "vitest";

import {
  extensionDe,
  normalizarFoto,
  tipoDeArchivo,
  validarArchivo,
} from "./fotosAdminApi";
import type { Foto } from "../../../../types/turismo";

function archivo(nombre: string, type = ""): File {
  return new File(["contenido"], nombre, { type });
}

describe("extensionDe", () => {
  it("devuelve la extensión en minúsculas", () => {
    expect(extensionDe("Foto.JPG")).toBe("jpg");
    expect(extensionDe("video.final.MP4")).toBe("mp4");
  });

  it("devuelve cadena vacía si no hay punto", () => {
    expect(extensionDe("sinformato")).toBe("");
  });
});

describe("tipoDeArchivo", () => {
  it("clasifica por MIME", () => {
    expect(tipoDeArchivo(archivo("a.jpg", "image/jpeg"))).toBe("imagen");
    expect(tipoDeArchivo(archivo("a.mp4", "video/mp4"))).toBe("video");
  });

  it("cae a la extensión cuando falta el MIME", () => {
    expect(tipoDeArchivo(archivo("a.webp"))).toBe("imagen");
    expect(tipoDeArchivo(archivo("a.webm"))).toBe("video");
  });

  it("devuelve null si no es imagen ni video", () => {
    expect(tipoDeArchivo(archivo("notas.txt", "text/plain"))).toBeNull();
  });
});

describe("validarArchivo", () => {
  it("acepta una imagen permitida", () => {
    expect(validarArchivo(archivo("foto.png", "image/png"))).toBeNull();
  });

  it("rechaza un formato de imagen no permitido", () => {
    const motivo = validarArchivo(archivo("foto.bmp", "image/bmp"));

    expect(motivo).toContain("bmp");
    expect(motivo).toContain("jpg");
  });

  it("rechaza un archivo que no es imagen ni video", () => {
    expect(validarArchivo(archivo("doc.pdf", "application/pdf"))).toContain(
      "compatible",
    );
  });

  it("rechaza una imagen que supera los 10 MB", () => {
    const grande = {
      name: "grande.jpg",
      type: "image/jpeg",
      size: 11 * 1024 * 1024,
    } as File;

    expect(validarArchivo(grande)).toContain("10 MB");
  });

  it("rechaza un video que supera los 100 MB", () => {
    const grande = {
      name: "grande.mp4",
      type: "video/mp4",
      size: 101 * 1024 * 1024,
    } as File;

    expect(validarArchivo(grande)).toContain("100 MB");
  });
});

describe("normalizarFoto", () => {
  it("coacciona ids, orden y estado por defecto", () => {
    const cruda = {
      id_foto: "7",
      atractivo: "uuid-1",
      public_id: "turismo/x",
      url: "https://res.cloudinary.com/x",
      tipo: "video",
      estado: "completed",
      ancho: 800,
      alto: 600,
      orden: "3",
      fecha_creacion: "2026-10-03T18:14:30Z",
    } as unknown as Foto;

    const foto = normalizarFoto(cruda);

    expect(foto.id_foto).toBe(7);
    expect(foto.orden).toBe(3);
    expect(foto.tipo).toBe("video");
    expect(foto.estado).toBe("completed");
  });

  it("cae a imagen/completed y a cero cuando faltan datos", () => {
    const cruda = {
      id_foto: 2,
      atractivo: null,
      public_id: null,
      url: null,
    } as unknown as Foto;

    const foto = normalizarFoto(cruda);

    expect(foto.tipo).toBe("imagen");
    expect(foto.estado).toBe("completed");
    expect(foto.orden).toBe(0);
    expect(foto.public_id).toBe("");
  });
});
