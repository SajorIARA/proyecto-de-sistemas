/**
 * Pruebas de la galería administrable.
 *
 * Los hooks (`useFotosAdmin`) se mockean: acá se prueba la interacción del
 * componente (validar antes de subir, subir lo válido, borrar), no la red.
 * La validación y normalización puras viven en `fotosAdminApi.test.ts`.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Foto } from "../../../../types/turismo";
import { GaleriaAdmin } from "./GaleriaAdmin";

const mocks = vi.hoisted(() => ({
  subir: vi.fn(),
  eliminar: vi.fn(),
  useFotosDe: vi.fn(),
}));

vi.mock("../hooks/useFotosAdmin", () => ({
  useFotosDe: (...args: unknown[]) => mocks.useFotosDe(...args),
  useSubirFoto: () => ({
    subir: mocks.subir,
    error: null,
    apiError: null,
    pendiente: false,
  }),
  useEliminarFoto: () => ({
    eliminar: mocks.eliminar,
    error: null,
    pendiente: false,
    idEnCurso: null,
  }),
}));

const ATRACTIVO = "a74e9ce4-9e17-4ce1-8a3e-415479ab6164";

function foto(overrides: Partial<Foto> = {}): Foto {
  return {
    id_foto: 1,
    atractivo: ATRACTIVO,
    public_id: "turismo/dev/a",
    url: "https://res.cloudinary.com/x/a",
    tipo: "imagen",
    estado: "completed",
    ancho: 800,
    alto: 600,
    orden: 0,
    fecha_creacion: "2026-10-03T18:14:30Z",
    ...overrides,
  };
}

function archivo(nombre: string, type = ""): File {
  return new File(["contenido"], nombre, { type });
}

describe("GaleriaAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useFotosDe.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    });
    mocks.subir.mockResolvedValue(foto());
    mocks.eliminar.mockResolvedValue(true);
  });

  it("muestra el estado vacío sin fotos", () => {
    render(<GaleriaAdmin atractivoId={ATRACTIVO} />);

    expect(screen.getByText(/todavía no hay fotos/i)).toBeInTheDocument();
  });

  it("sube un archivo válido con el orden siguiente", async () => {
    mocks.useFotosDe.mockReturnValue({
      data: [foto({ id_foto: 1, orden: 0 })],
      isPending: false,
      isError: false,
      error: null,
    });

    render(<GaleriaAdmin atractivoId={ATRACTIVO} />);

    const input = screen.getByLabelText(/agregar imágenes o videos/i);
    fireEvent.change(input, {
      target: { files: [archivo("nueva.jpg", "image/jpeg")] },
    });

    await waitFor(() => expect(mocks.subir).toHaveBeenCalledTimes(1));

    expect(mocks.subir).toHaveBeenCalledWith(
      expect.objectContaining({
        archivo: expect.any(File),
        orden: 1,
      }),
    );
  });

  it("no sube un archivo inválido y avisa el motivo", async () => {
    render(<GaleriaAdmin atractivoId={ATRACTIVO} />);

    const input = screen.getByLabelText(/agregar imágenes o videos/i);
    fireEvent.change(input, {
      target: { files: [archivo("notas.txt", "text/plain")] },
    });

    expect(mocks.subir).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/compatible/i);
  });

  it("elimina una foto existente", async () => {
    mocks.useFotosDe.mockReturnValue({
      data: [foto({ id_foto: 42 })],
      isPending: false,
      isError: false,
      error: null,
    });

    render(<GaleriaAdmin atractivoId={ATRACTIVO} />);

    fireEvent.click(screen.getByRole("button", { name: /eliminar la foto 1/i }));

    await waitFor(() => expect(mocks.eliminar).toHaveBeenCalledWith(42));
  });
});
