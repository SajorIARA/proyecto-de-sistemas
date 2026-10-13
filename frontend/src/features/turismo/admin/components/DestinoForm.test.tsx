/**
 * Pruebas del formulario de alta/edición.
 *
 * La que más importa es la del 0 en la duración: es el único error que el
 * backend reporta como 500 en lugar de 400, así que la red de seguridad tiene
 * que estar en el frontend y hay que probarla.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../../auth/context/AuthContext";
import * as api from "../api/destinosAdminApi";
import { DestinoForm } from "../components/DestinoForm";
import { VALORES_INICIALES } from "../utils/destinoForm";
import type { AtractivoAdmin, Categoria } from "../../../../types/turismo";

vi.mock("../api/destinosAdminApi", async () => {
  const real = await vi.importActual<
    typeof import("../api/destinosAdminApi")
  >("../api/destinosAdminApi");

  // Se sustituyen los exports **nombrados**, que es como los importa
  // `useGuardarDestino`. Sustituir los métodos del objeto `destinosAdminApi`
  // no surtiría efecto: el hook no pasa por él.
  return {
    ...real,
    crearDestino: vi.fn(),
    actualizarDestino: vi.fn(),
  };
});

const CATEGORIAS: Categoria[] = [
  { id_categoria: 5, nombre: "Naturaleza", descripcion: null, activo: true },
];

function cliente() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, retryDelay: 0 } },
  });
}

function sesion() {
  localStorage.setItem("turismo_access_token", "access-test");
  localStorage.setItem("turismo_refresh_token", "refresh-test");
  localStorage.setItem(
    "turismo_auth_user",
    JSON.stringify({
      nombre: "Admin Paz",
      email: "admin@example.com",
      roles: ["ADMIN"],
    }),
  );
}

function creado(overrides: Partial<AtractivoAdmin> = {}): AtractivoAdmin {
  return {
    id_atractivo: "nuevo-id",
    nombre: "Valle de la Luna",
    descripcion: "Formaciones de arcilla.",
    direccion: null,
    duracion_minutos: 90,
    ubicacion: { longitud: -68.1375, latitud: -16.4961 },
    area: null,
    categorias: [],
    fotos: [],
    fuente_origen: "INSTITUCIONAL",
    activo: true,
    fecha_creacion: "2026-10-03T19:04:13Z",
    fecha_actualizacion: "2026-10-03T19:04:13Z",
    ...overrides,
  };
}

function renderForm(
  alGuardar: () => void = vi.fn(),
  valores = VALORES_INICIALES,
  categorias: Categoria[] = CATEGORIAS,
  pendienteCarga = false,
  idDestino?: string,
) {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter>
        <AuthProvider>
          <DestinoForm
            idDestino={idDestino}
            valoresIniciales={valores}
            categorias={categorias}
            pendienteCarga={pendienteCarga}
            alGuardar={alGuardar}
          />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Rellena los campos obligatorios de un destino válido. */
function completar() {
  fireEvent.change(screen.getByLabelText(/nombre del destino/i), {
    target: { value: "Valle de la Luna" },
  });
  fireEvent.change(screen.getByLabelText(/^descripción/i), {
    target: { value: "Formaciones de arcilla en el altiplano." },
  });
  fireEvent.change(screen.getByLabelText(/^longitud/i), {
    target: { value: "-68.1375" },
  });
  fireEvent.change(screen.getByLabelText(/^latitud/i), {
    target: { value: "-16.4961" },
  });
}

describe("DestinoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sesion();
  });

  it("no envía nada si faltan los campos obligatorios", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /crear destino/i }));

    expect(
      await screen.findByText(/el nombre del destino es obligatorio/i),
    ).toBeInTheDocument();
    expect(api.crearDestino).not.toHaveBeenCalled();
  });

  /**
   * El caso crítico. Con `0`, Postgres violaría el CHECK
   * `duracion_minutos > 0` y Django respondería 500 con el traceback, así que
   * el formulario no debe ni dejar salir la petición.
   */
  it("bloquea el envío cuando la duración es 0", async () => {
    renderForm();

    completar();
    fireEvent.change(screen.getByLabelText(/duración de la visita/i), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear destino/i }));

    expect(
      await screen.findByText(/la duración debe ser de al menos 1 minuto/i),
    ).toBeInTheDocument();
    expect(api.crearDestino).not.toHaveBeenCalled();
  });

  it("rechaza coordenadas fuera de rango antes de la petición", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/nombre del destino/i), {
      target: { value: "Valle" },
    });
    fireEvent.change(screen.getByLabelText(/^descripción/i), {
      target: { value: "Arcilla." },
    });
    fireEvent.change(screen.getByLabelText(/^longitud/i), {
      target: { value: "999" },
    });
    fireEvent.change(screen.getByLabelText(/^latitud/i), {
      target: { value: "-16.4961" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear destino/i }));

    expect(
      await screen.findByText(/la longitud debe estar entre -180 y 180/i),
    ).toBeInTheDocument();
    expect(api.crearDestino).not.toHaveBeenCalled();
  });

  it("envía el payload que espera el backend", async () => {
    const alGuardar = vi.fn();

    vi.mocked(api.crearDestino).mockResolvedValue(creado());

    renderForm(alGuardar);

    completar();
    fireEvent.change(screen.getByLabelText(/duración de la visita/i), {
      target: { value: "90" },
    });
    fireEvent.click(screen.getByLabelText("Naturaleza"));
    fireEvent.click(screen.getByRole("button", { name: /crear destino/i }));

    await waitFor(() =>
      expect(api.crearDestino).toHaveBeenCalledWith({
        nombre: "Valle de la Luna",
        descripcion: "Formaciones de arcilla en el altiplano.",
        direccion: null,
        duracion_minutos: 90,
        ubicacion: { longitud: -68.1375, latitud: -16.4961 },
        categorias: [5],
        fuente_origen: "INSTITUCIONAL",
        activo: true,
      }),
    );

    await waitFor(() => expect(alGuardar).toHaveBeenCalled());
  });

  /**
   * Regresión grave. El componente recibía un `modo` aparte que solo cambiaba
   * los textos, y llamaba a la mutación sin id: al editar terminaba haciendo
   * `POST` y el backend creaba un destino duplicado en lugar de actualizar el
   * existente. Este test fija que editar va por `actualizarDestino` y que
   * `crearDestino` no se toca.
   */
  it("al editar hace PATCH y no crea un destino nuevo", async () => {
    const alGuardar = vi.fn();
    const ID = "a74e9ce4-9e17-4ce1-8a3e-415479ab6164";

    vi.mocked(api.actualizarDestino).mockResolvedValue(
      creado({ id_atractivo: ID, nombre: "Valle de la Luna EDITADO" }),
    );

    renderForm(
      alGuardar,
      {
        ...VALORES_INICIALES,
        nombre: "Valle de la Luna",
        descripcion: "Arcilla.",
        longitud: "-68.1375",
        latitud: "-16.4961",
      },
      CATEGORIAS,
      false,
      ID,
    );

    // El botón dice "guardar" cuando hay id.
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(api.actualizarDestino).toHaveBeenCalledWith(
        ID,
        expect.objectContaining({ nombre: "Valle de la Luna" }),
      ),
    );

    expect(api.crearDestino).not.toHaveBeenCalled();
    await waitFor(() => expect(alGuardar).toHaveBeenCalled());
  });

  it("el alta no toca actualizarDestino", async () => {
    vi.mocked(api.crearDestino).mockResolvedValue(creado());

    renderForm();

    completar();
    fireEvent.click(screen.getByRole("button", { name: /crear destino/i }));

    await waitFor(() => expect(api.crearDestino).toHaveBeenCalled());
    expect(api.actualizarDestino).not.toHaveBeenCalled();
  });

  it("no habilita el formulario mientras se cargan las categorías", () => {
    // Sin esta barrera, el botón de guardar queda activo antes de que
    // `/turismo/categorias/` responda y un alta rápida publica el destino
    // sin ninguna categoría.
    renderForm(vi.fn(), VALORES_INICIALES, [], true);

    expect(
      screen.getByRole("button", { name: /crear destino/i }),
    ).toBeDisabled();

    expect(
      screen.queryByText(/no hay categorías activas/i),
    ).not.toBeInTheDocument();
  });

  it("avisa de verdad cuando no hay ninguna categoría activa", () => {
    renderForm(vi.fn(), VALORES_INICIALES, [], false);

    expect(
      screen.getByText(/no hay categorías activas/i),
    ).toBeInTheDocument();
  });

  it("muestra bajo el input el mensaje que devuelve el backend", async () => {
    const { DestinosAdminApiError } = await import("../api/destinosAdminApi");

    vi.mocked(api.crearDestino).mockRejectedValue(
      new DestinosAdminApiError("Este campo es requerido.", 400, {
        descripcion: ["Este campo es requerido."],
      }),
    );

    renderForm();

    completar();
    fireEvent.click(screen.getByRole("button", { name: /crear destino/i }));

    // El mensaje del backend se pinta bajo el textarea y este queda marcado
    // como inválido, para que el lector de pantalla lo anuncie.
    const textarea = screen.getByLabelText(/^descripción/i);

    await waitFor(() =>
      expect(textarea).toHaveAttribute("aria-invalid", "true"),
    );
    expect(
      await screen.findAllByText("Este campo es requerido."),
    ).not.toHaveLength(0);
  });

  it("avisa que no salió de la sesión cuando el backend responde 403", async () => {
    const { DestinosAdminApiError } = await import("../api/destinosAdminApi");

    vi.mocked(api.crearDestino).mockRejectedValue(
      new DestinosAdminApiError(
        "No tenés permiso para esta acción.",
        403,
      ),
    );

    renderForm();

    completar();
    fireEvent.click(screen.getByRole("button", { name: /crear destino/i }));

    // Un 403 no señala ningún campo: va como mensaje global, no bajo el nombre
    // del destino (que es donde lo situaría un mapeo ingenuo).
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tenés permiso para esta acción.",
    );
    expect(screen.getByLabelText(/nombre del destino/i)).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });
});