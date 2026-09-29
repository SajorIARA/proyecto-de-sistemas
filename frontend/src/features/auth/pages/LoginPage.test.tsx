import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "../api/authApi";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "./LoginPage";

vi.mock("../api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/mi-cuenta" element={<h1>Área privada</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("inicia sesión, guarda los JWT y navega al área privada", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      raw: {},
      tokens: {
        access: "access-test",
        refresh: "refresh-test",
      },
      user: {
        id: 1,
        nombre: "Jordan",
        email: "jordan@example.com",
      },
    });

    renderLogin();

    fireEvent.change(
      screen.getByRole("textbox", { name: /correo electrónico/i }),
      {
        target: { value: "jordan@example.com" },
      },
    );

    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "secreto123" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /iniciar sesión/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /área privada/i }),
      ).toBeInTheDocument();
    });

    expect(localStorage.getItem("turismo_access_token")).toBe(
      "access-test",
    );

    expect(localStorage.getItem("turismo_refresh_token")).toBe(
      "refresh-test",
    );

    expect(authApi.login).toHaveBeenCalledWith({
      email: "jordan@example.com",
      password: "secreto123",
    });
  });
});