import { describe, it, expect, beforeEach } from "vitest";
import api, { API_BASE_URL } from "./axios";
import { STORAGE_KEYS } from "../utils/store";

/** Runs the configured request interceptor chain against a bare config. */
function runRequestInterceptor(config = { headers: {} }) {
  const handlers = api.interceptors.request.handlers.filter(Boolean);
  return handlers.reduce((acc, h) => h.fulfilled(acc), config);
}

beforeEach(() => {
  localStorage.clear();
});

describe("axios instance", () => {
  it("is configured with the base url, json headers and a timeout", () => {
    expect(api.defaults.baseURL).toBe(API_BASE_URL);
    expect(api.defaults.headers["Content-Type"]).toBe("application/json");
    expect(api.defaults.timeout).toBe(15000);
  });

  it("leaves the authorization header off when no token is stored", () => {
    expect(runRequestInterceptor().headers.Authorization).toBeUndefined();
  });

  it("attaches the stored token as a bearer header", () => {
    localStorage.setItem(STORAGE_KEYS.token, "abc123");
    expect(runRequestInterceptor().headers.Authorization).toBe("Bearer abc123");
  });

  it("rejects request errors untouched", async () => {
    const error = new Error("boom");
    const rejected = api.interceptors.request.handlers.find(
      (h) => h && h.rejected
    ).rejected;
    await expect(rejected(error)).rejects.toBe(error);
  });
});
