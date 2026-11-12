/**
 * Pruebas de la galería en modo borrador del alta de destinos.
 *
 * El componente es controlado: recibe los pendientes y avisa por callbacks.
 * Acá se prueba la interacción (validar, entregar lo válido, quitar) sin red.
 * La conversión a `ArchivoPendiente` y la miniatura viven en
 * `archivosPendientes.ts`; la validación pura, en `fotosAdminApi.test.ts`.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ArchivoPendiente } from "../utils/archivosPendientes";
import { GaleriaNueva } from "./GaleriaNueva";

function archivo(nombre: string, type = ""): File {
  return new File(["contenido"], nombre, { type });
}

function pendiente(overrides: Partial<ArchivoPendiente> = {}): ArchivoPendiente {
  return {
    id: "p1",
    archivo: archivo("foto.jpg", "image/jpeg"),
    tipo: "imagen",
    previewUrl: null,
    ...overrides,
  };
}

describe("GaleriaNueva", () => {
  it("muestra el estado vacío sin archivos", () => {
    render(
      <GaleriaNueva archivos={[]} onAgregar={vi.fn()} onQuitar={vi.fn()} />,
    );

    expect(
      screen.getByText(/todavía no agregaste archivos/i),
    ).toBeInTheDocument();
  });

  it("entrega los archivos válidos al elegirlos", () => {
    const onAgregar = vi.fn();

    render(
      <GaleriaNueva archivos={[]} onAgregar={onAgregar} onQuitar={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/agregar imágenes o videos/i), {
      target: { files: [archivo("nueva.jpg", "image/jpeg")] },
    });

    expect(onAgregar).toHaveBeenCalledTimes(1);

    const entregados = onAgregar.mock.calls[0][0] as ArchivoPendiente[];

    expect(entregados).toHaveLength(1);
    expect(entregados[0].archivo.name).toBe("nueva.jpg");
    expect(entregados[0].tipo).toBe("imagen");
  });

  it("rechaza un archivo inválido y avisa el motivo", () => {
    const onAgregar = vi.fn();

    render(
      <GaleriaNueva archivos={[]} onAgregar={onAgregar} onQuitar={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/agregar imágenes o videos/i), {
      target: { files: [archivo("notas.txt", "text/plain")] },
    });

    expect(onAgregar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/compatible/i);
  });

  it("lista los pendientes y permite quitarlos", () => {
    const onQuitar = vi.fn();

    render(
      <GaleriaNueva
        archivos={[
          pendiente({ id: "abc", archivo: archivo("portada.png", "image/png") }),
        ]}
        onAgregar={vi.fn()}
        onQuitar={onQuitar}
      />,
    );

    expect(screen.getByText(/portada\.png/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /quitar el archivo 1/i }));

    expect(onQuitar).toHaveBeenCalledWith("abc");
  });

  it("marca el primer archivo como portada", () => {
    render(
      <GaleriaNueva
        archivos={[pendiente({ id: "a" })]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
      />,
    );

    expect(screen.getByText(/portada ·/i)).toBeInTheDocument();
  });
});
