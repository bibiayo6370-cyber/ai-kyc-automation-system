import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  storeSession
} from "@/lib/authStorage";

describe("authentication storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves the authenticated session", () => {
    const user = {
      id: "admin-1",
      fullName: "App Admin",
      email: "admin@example.com",
      role: "admin"
    };

    storeSession("secure-test-token", user);

    expect(getStoredToken()).toBe("secure-test-token");
    expect(getStoredUser()).toEqual(user);
  });

  it("removes both token and user data during logout", () => {
    storeSession("secure-test-token", {
      id: "customer-1",
      role: "customer"
    });

    clearStoredSession();

    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("clears a corrupted stored-user record", () => {
    localStorage.setItem("ai_kyc_access_token", "test-token");
    localStorage.setItem("ai_kyc_authenticated_user", "{invalid-json");

    expect(getStoredUser()).toBeNull();
    expect(getStoredToken()).toBeNull();
  });
});