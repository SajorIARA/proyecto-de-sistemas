/**
 * Pruebas de la página del formulario de destinos.
 *
 * El foco está en el modo alta, donde la página tiene que sortear un detalle
 * de TanStack Query que ya rompió el formulario una vez: `useDestinoAdmin` va
 * con `enabled: false` cuando no hay id, y una query deshabilitada se queda en
 * `pending` para siempre. Si esa páginaLee `isPending` sin condicionar, el
 * formulario de alta queda bloqueado y no se puede crear nada.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../../auth/context/AuthContext";
import * as api from "../api/destinosAdminApi";
import * as fotos from "../api/fotosAdminApi";
import * as turismo from "../../api/turismoApi";
import { AdminDestinoFormPage } from "./AdminDestinoFormPage";

vi.mock("../api/destinosAdminApi", async () => {
  const real = await vi.importActual<
    typeof import("../api/destinosAdminApi")
  >("../api/destinosAdminApi");

  return {
    ...real,
    obtenerDestino: vi.fn(),
    listarDestinos: vi.fn(),
    crearDestino: vi.fn(),
  };
});

// La subida real a Cloudinary no se ejerce acá: se comprueba que el alta la
// dispare con el id recién creado. Las partes puras quedan sin mockear.
vi.mock("../api/fotosAdminApi", async () => {
  const real = await vi.importActual<typeof import("../api/fotosAdminApi")>(
    "../api/fotosAdminApi",
  );

  return { ...real, subirFotoDestino: vi.fn() };
});

vi.mock("../../api/turismoApi", async () => {
  const real = await vi.importActual<typeof import("../../api/turismoApi")>(
    "../../api/turismoApi",
  );

  return { ...real, listarCategorias: vi.fn() };
});

// La galería (solo en edición) consulta fotos; se neutraliza para que la
// prueba de la página no dependa de la red.
vi.mock("../hooks/useFotosAdmin", () => ({
  useFotosDe: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
  }),
  useSubirFoto: () => ({
    subir: vi.fn(),
    error: null,
    apiError: null,
    pendiente: false,
  }),
  useEliminarFoto: () => ({
    eliminar: vi.fn(),
    error: null,
    pendiente: false,
    idEnCurso: null,
  }),
}));

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

function renderEn(ruta: string) {
  return render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/mi-cuenta/destinos/nuevo"
              element={<AdminDestinoFormPage />}
            />
            <Route
              path="/mi-cuenta/destinos/:id/editar"
              element={<AdminDestinoFormPage />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminDestinoFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sesion();

    vi.mocked(turismo.listarCategorias).mockResolvedValue([
      { id_categoria: 5, nombre: "Naturaleza", descripcion: null, activo: true },
    ]);
  });

  it("en alta habilita el formulario aunque la query del destino esté apagada", async () => {
    renderEn("/mi-cuenta/destinos/nuevo");

    const boton = await screen.findByRole("button", { name: /crear destino/i });

    // La regresión: con `enabled: false`, `isPending` de `useDestinoAdmin` es
    // `true` para siempre y el botón quedaba deshabilitado en el alta.
    await waitFor(() => expect(boton).not.toBeDisabled());

    // Y debe ofrecer las categorías, no el mensaje de "no hay categorías".
    expect(
      screen.queryByText(/no hay categorías activas/i),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Naturaleza")).toBeInTheDocument();
  });

  it("en alta no pide el detalle de ningún destino", async () => {
    renderEn("/mi-cuenta/destinos/nuevo");

    await screen.findByRole("button", { name: /crear destino/i });

    expect(api.obtenerDestino).not.toHaveBeenCalled();
  });

  it("en edición pide el destino y precarga el nombre", async () => {
    vi.mocked(api.obtenerDestino).mockResolvedValue({
      id_atractivo: "a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
      nombre: "Valle de la Luna",
      descripcion: "Formaciones de arcilla.",
      direccion: "Zona Sur",
      duracion_minutos: 120,
      ubicacion: { longitud: -68.1375, latitud: -16.4961 },
      area: null,
      categorias: [5],
      fotos: [],
      fuente_origen: "INSTITUCIONAL",
      activo: true,
      fecha_creacion: "2026-10-03T18:14:30Z",
      fecha_actualizacion: "2026-10-03T18:14:30Z",
    });

    renderEn("/mi-cuenta/destinos/a74e9ce4-9e17-4ce1-8a3e-415479ab6164/editar");

    expect(await screen.findByDisplayValue("Valle de la Luna")).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(api.obtenerDestino).toHaveBeenCalledWith(
      "a74e9ce4-9e17-4ce1-8a3e-415479ab6164",
    );

    // El botón dice "guardar", no "crear".
    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeInTheDocument();
  });

  it("muestra el error si no se puede cargar el destino a editar", async () => {
    const { DestinosAdminApiError } = await import("../api/destinosAdminApi");

    vi.mocked(api.obtenerDestino).mockRejectedValue(
      new DestinosAdminApiError("No existe ese destino.", 404),
    );

    renderEn("/mi-cuenta/destinos/no-existe/editar");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No existe ese destino.",
    );

    // No debe caer en el formulario vacío: un 404 no es "crear uno nuevo".
    expect(
      screen.queryByRole("button", { name: /crear destino/i }),
    ).not.toBeInTheDocument();
  });

  it("en alta ofrece la sección para adjuntar imágenes", async () => {
    renderEn("/mi-cuenta/destinos/nuevo");

    await screen.findByRole("button", { name: /crear destino/i });

    expect(
      screen.getByRole("heading", { name: /fotografías y videos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/agregar imágenes o videos/i),
    ).toBeInTheDocument();
    // El estado vacío propio del borrador (distinto al de `GaleriaAdmin`).
    expect(
      screen.getByText(/todavía no agregaste archivos/i),
    ).toBeInTheDocument();
  });

  it("en alta sube los archivos adjuntos tras crear el destino", async () => {
    const NUEVO_ID = "b1b2c3d4-0000-4000-8000-000000000001";

    vi.mocked(api.crearDestino).mockResolvedValue({
      id_atractivo: NUEVO_ID,
      nombre: "Nuevo destino",
      descripcion: "Una descripción.",
      direccion: null,
      duracion_minutos: null,
      ubicacion: { longitud: -68.13, latitud: -16.49 },
      area: null,
      categorias: [],
      fotos: [],
      fuente_origen: "INSTITUCIONAL",
      activo: true,
      fecha_creacion: "2026-10-03T18:14:30Z",
      fecha_actualizacion: "2026-10-03T18:14:30Z",
    });

    vi.mocked(fotos.subirFotoDestino).mockResolvedValue({
      id_foto: 1,
      atractivo: NUEVO_ID,
      public_id: "turismo/nuevo/foto",
      url: "https://res.cloudinary.com/x/foto",
      tipo: "imagen",
      estado: "completed",
      ancho: 800,
      alto: 600,
      orden: 0,
      fecha_creacion: "2026-10-03T18:14:30Z",
    });

    renderEn("/mi-cuenta/destinos/nuevo");

    const crear = await screen.findByRole("button", { name: /crear destino/i });
    await waitFor(() => expect(crear).not.toBeDisabled());

    fireEvent.change(screen.getByLabelText(/agregar imágenes o videos/i), {
      target: { files: [new File(["x"], "foto.jpg", { type: "image/jpeg" })] },
    });

    fireEvent.change(screen.getByLabelText(/nombre del destino/i), {
      target: { value: "Nuevo destino" },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "Una descripción." },
    });
    fireEvent.change(screen.getByLabelText(/longitud/i), {
      target: { value: "-68.13" },
    });
    fireEvent.change(screen.getByLabelText(/latitud/i), {
      target: { value: "-16.49" },
    });

    fireEvent.click(crear);

    await waitFor(() => expect(api.crearDestino).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(fotos.subirFotoDestino).toHaveBeenCalledTimes(1),
    );

    expect(fotos.subirFotoDestino).toHaveBeenCalledWith(
      expect.objectContaining({ atractivo: NUEVO_ID, orden: 0 }),
      expect.any(Function),
    );
  });
});