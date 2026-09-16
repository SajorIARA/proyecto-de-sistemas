import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "../features/auth/api/authApi";
import { AuthProvider } from "../features/auth/context/AuthContext";
import { AccountPage } from "./AccountPage";

vi.mock("../features/auth/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function renderAccount() {
  return render(
    <MemoryRouter initialEntries={["/mi-cuenta"]}>
      <AuthProvider>
        <Routes>
          <Route path="/mi-cuenta" element={<AccountPage />} />
          <Route path="/" element={<h1>Página principal</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    localStorage.setItem(
      "turismo_access_token",
      "access-test",
    );

    localStorage.setItem(
      "turismo_refresh_token",
      "refresh-test",
    );

    localStorage.setItem(
      "turismo_auth_user",
      JSON.stringify({
        nombre: "Jordan",
        email: "jordan@example.com",
      }),
    );
  });

  it("cierra sesión, elimina tokens y vuelve al inicio", async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    renderAccount();

    expect(
      screen.getByText("jordan@example.com"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /página principal/i,
        }),
      ).toBeInTheDocument();
    });

    expect(authApi.logout).toHaveBeenCalledWith("refresh-test");

    expect(
      localStorage.getItem("turismo_access_token"),
    ).toBeNull();

    expect(
      localStorage.getItem("turismo_refresh_token"),
    ).toBeNull();

    expect(
      localStorage.getItem("turismo_auth_user"),
    ).toBeNull();
  });
});