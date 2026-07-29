import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RoleRedirect } from "@/App";
import useAuth from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  default: vi.fn()
}));

function renderRoleRedirect() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/admin" element={<p>Administrator page</p>} />
        <Route path="/customer" element={<p>Customer page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RoleRedirect", () => {
  it("redirects an unauthenticated visitor to login", () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null
    });

    renderRoleRedirect();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects an Administrator to the Administrator workspace", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "admin" }
    });

    renderRoleRedirect();

    expect(screen.getByText("Administrator page")).toBeInTheDocument();
  });

  it("redirects a customer to the customer portal", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: "customer" }
    });

    renderRoleRedirect();

    expect(screen.getByText("Customer page")).toBeInTheDocument();
  });
});