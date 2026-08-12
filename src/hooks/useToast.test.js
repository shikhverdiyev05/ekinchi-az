import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useToast } from "./useToast";

afterEach(() => {
  vi.useRealTimers();
});

describe("useToast", () => {
  it("starts with no toast and keeps a stable show callback", () => {
    const { result, rerender } = renderHook(() => useToast());
    expect(result.current.toast).toBeNull();
    const show = result.current.show;
    rerender();
    expect(result.current.show).toBe(show);
  });

  it("shows a success toast by default and hides it after 3 seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.show("Yadda saxlanildi"));
    expect(result.current.toast).toEqual({
      message: "Yadda saxlanildi",
      type: "success",
    });
    act(() => vi.advanceTimersByTime(2999));
    expect(result.current.toast).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toast).toBeNull();
  });

  it("accepts an explicit toast type", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.show("Xəta", "error"));
    expect(result.current.toast.type).toBe("error");
  });

  it("replaces the visible toast when show is called again", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.show("first"));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.show("second", "error"));
    expect(result.current.toast).toEqual({ message: "second", type: "error" });
  });
});
