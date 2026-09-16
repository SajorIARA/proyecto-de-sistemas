import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "../api/authApi";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

vi.mock("../api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/registro"]}>
      <AuthProvider>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("envía el registro y redirige al login", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      raw: {
        message: "Usuario registrado",
      },
      tokens: null,
      user: null,
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Jordan" },
    });

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "jordan@example.com" },
    });

    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: "secreto123" },
    });

    fireEvent.change(
      screen.getByLabelText(/confirmar contraseña/i),
      {
        target: { value: "secreto123" },
      },
    );

    fireEvent.click(
      screen.getByRole("button", { name: /crear cuenta/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/cuenta creada correctamente/i),
      ).toBeInTheDocument();
    });

    expect(authApi.register).toHaveBeenCalledWith({
      nombre: "Jordan",
      email: "jordan@example.com",
      password: "secreto123",
      password_confirm: "secreto123",
    });
  });

  it("detecta contraseñas diferentes antes de llamar al backend", () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Jordan" },
    });

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "jordan@example.com" },
    });

    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: "secreto123" },
    });

    fireEvent.change(
      screen.getByLabelText(/confirmar contraseña/i),
      {
        target: { value: "otro12345" },
      },
    );

    fireEvent.click(
      screen.getByRole("button", { name: /crear cuenta/i }),
    );

    expect(
      screen.getByText(/las contraseñas no coinciden/i),
    ).toBeInTheDocument();

    expect(authApi.register).not.toHaveBeenCalled();
  });
});