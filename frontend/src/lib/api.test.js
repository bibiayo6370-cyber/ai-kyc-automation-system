import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import {
  clearStoredSession,
  storeSession
} from "@/lib/authStorage";

function successfulAdapter(config) {
  return Promise.resolve({
    config,
    data: { success: true },
    headers: {},
    status: 200,
    statusText: "OK"
  });
}

function failingAdapter(status) {
  return async function adapter(config) {
    throw new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      config,
      null,
      {
        config,
        data: {},
        headers: {},
        status,
        statusText: "Request failed"
      }
    );
  };
}

describe("API security interceptors", () => {
  beforeEach(() => {
    clearStoredSession();
    vi.restoreAllMocks();
  });

  it("attaches the stored JWT to protected API requests", async () => {
    storeSession("jwt-test-token", {
      id: "admin-1",
      role: "admin"
    });

    const response = await api.get("/protected-test", {
      adapter: successfulAdapter
    });

    expect(response.config.headers.Authorization).toBe(
      "Bearer jwt-test-token"
    );
  });

  it("dispatches session invalidation after a 401 response", async () => {
    storeSession("expired-token", {
      id: "admin-1",
      role: "admin"
    });

    const dispatchEvent = vi.spyOn(window, "dispatchEvent");

    await expect(
      api.get("/expired-session-test", {
        adapter: failingAdapter(401)
      })
    ).rejects.toBeInstanceOf(AxiosError);

    expect(dispatchEvent).toHaveBeenCalled();
    expect(dispatchEvent.mock.calls[0][0].type).toBe(
      "auth:session-invalid"
    );
  });

  it("does not destroy a valid session for a normal role-based 403", async () => {
    storeSession("customer-token", {
      id: "customer-1",
      role: "customer"
    });

    const dispatchEvent = vi.spyOn(window, "dispatchEvent");

    await expect(
      api.get("/administrator-test", {
        adapter: failingAdapter(403)
      })
    ).rejects.toBeInstanceOf(AxiosError);

    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("invalidates the session for a controlled account-status 403", async () => {
    storeSession("inactive-token", {
      id: "customer-1",
      role: "customer"
    });

    const dispatchEvent = vi.spyOn(window, "dispatchEvent");

    await expect(
      api.get("/auth/profile", {
        adapter: failingAdapter(403),
        logoutOnForbidden: true
      })
    ).rejects.toBeInstanceOf(AxiosError);

    expect(dispatchEvent).toHaveBeenCalled();
    expect(dispatchEvent.mock.calls[0][0].type).toBe(
      "auth:session-invalid"
    );
  });
});