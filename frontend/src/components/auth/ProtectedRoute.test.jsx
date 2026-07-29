import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import useAuth from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  default: vi.fn()
}));

function renderProtectedRoute({
  initialPath = "/admin",
  allowedRoles = ["admin"]
} = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<p>Login destination</p>} />
        <Route path="/unauthorized" element={<p>Unauthorized destination</p>} />

        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/admin" element={<p>Administrator content</p>} />
          <Route path="/customer" element={<p>Customer content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows a session validation state while authentication is loading", () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null
    });

    renderProtectedRoute();

    expect(
      screen.getByText("Validating your session...")
    ).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor to login", () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null
    });

    renderProtectedRoute();

    expect(screen.getByText("Login destination")).toBeInTheDocument();
  });

  it("redirects a customer away from Administrator routes", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "customer" }
    });

    renderProtectedRoute();

    expect(screen.getByText("Unauthorized destination")).toBeInTheDocument();
  });

  it("allows an Administrator to access the Administrator route", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "admin" }
    });

    renderProtectedRoute();

    expect(screen.getByText("Administrator content")).toBeInTheDocument();
  });

  it("allows a customer to access the customer route", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "customer" }
    });

    renderProtectedRoute({
      initialPath: "/customer",
      allowedRoles: ["customer"]
    });

    expect(screen.getByText("Customer content")).toBeInTheDocument();
  });
});