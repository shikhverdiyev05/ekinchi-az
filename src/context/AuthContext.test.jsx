import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import API from "../api";
import { STORAGE_KEYS, read, write } from "../utils/store";

vi.mock("../api", () => ({
  default: {
    auth: {
      getMe: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
    },
  },
}));

const user = { id: "u_me", fullName: "Me" };

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

/** Renders the provider and waits for the bootstrap effect to settle. */
async function renderReadyAuth() {
  const hook = renderAuth();
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("useAuth", () => {
  it("throws when used outside of an AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within AuthProvider"
    );
  });
});

describe("bootstrap", () => {
  it("finishes without calling the API when there is no token", async () => {
    const { result } = await renderReadyAuth();
    expect(API.auth.getMe).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it("restores the user when a token is present", async () => {
    write(STORAGE_KEYS.token, "tok");
    API.auth.getMe.mockResolvedValue({ user });
    const { result } = await renderReadyAuth();
    expect(result.current.user).toEqual(user);
  });

  it("clears the stored session when the token is no longer valid", async () => {
    write(STORAGE_KEYS.token, "tok");
    write(STORAGE_KEYS.currentUser, user);
    API.auth.getMe.mockRejectedValue(new Error("401"));
    const { result } = await renderReadyAuth();
    expect(result.current.user).toBeNull();
    expect(read(STORAGE_KEYS.token)).toBeNull();
    expect(read(STORAGE_KEYS.currentUser)).toBeNull();
  });
});

describe("login", () => {
  it("stores the returned user", async () => {
    API.auth.login.mockResolvedValue({ user });
    const { result } = await renderReadyAuth();
    await act(async () => {
      await expect(result.current.login("a@b.c", "pw")).resolves.toEqual(user);
    });
    expect(API.auth.login).toHaveBeenCalledWith("a@b.c", "pw");
    expect(result.current.user).toEqual(user);
  });

  it("surfaces the server message, then the error message, then a default", async () => {
    const { result } = await renderReadyAuth();
    API.auth.login.mockRejectedValueOnce({
      response: { data: { message: "Şifrə yanlışdır" } },
    });
    await expect(result.current.login("a@b.c", "pw")).rejects.toThrow(
      "Şifrə yanlışdır"
    );
    API.auth.login.mockRejectedValueOnce(new Error("network down"));
    await expect(result.current.login("a@b.c", "pw")).rejects.toThrow(
      "network down"
    );
    API.auth.login.mockRejectedValueOnce({});
    await expect(result.current.login("a@b.c", "pw")).rejects.toThrow(
      "Giriş uğursuz oldu"
    );
    expect(result.current.user).toBeNull();
  });
});

describe("register", () => {
  it("stores the returned user", async () => {
    API.auth.register.mockResolvedValue({ user });
    const { result } = await renderReadyAuth();
    await act(async () => {
      await result.current.register({ email: "a@b.c" });
    });
    expect(result.current.user).toEqual(user);
  });

  it("surfaces a default message when the failure carries none", async () => {
    API.auth.register.mockRejectedValue({});
    const { result } = await renderReadyAuth();
    await expect(result.current.register({})).rejects.toThrow(
      "Qeydiyyat uğursuz oldu"
    );
  });
});

describe("updateProfile", () => {
  it("replaces the user with the updated one", async () => {
    API.auth.updateProfile.mockResolvedValue({
      user: { ...user, region: "Bakı" },
    });
    const { result } = await renderReadyAuth();
    await act(async () => {
      await result.current.updateProfile({ region: "Bakı" });
    });
    expect(result.current.user.region).toBe("Bakı");
  });

  it("surfaces a default message when the failure carries none", async () => {
    API.auth.updateProfile.mockRejectedValue({});
    const { result } = await renderReadyAuth();
    await expect(result.current.updateProfile({})).rejects.toThrow(
      "Yenilenme uğursuz oldu"
    );
  });
});

describe("logout", () => {
  it("clears the user and the stored session", async () => {
    write(STORAGE_KEYS.token, "tok");
    API.auth.getMe.mockResolvedValue({ user });
    const { result } = await renderReadyAuth();
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(read(STORAGE_KEYS.token)).toBeNull();
  });
});
