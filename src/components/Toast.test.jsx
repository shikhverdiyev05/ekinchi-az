import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Toast from "./Toast";

describe("Toast", () => {
  it("renders nothing without a message", () => {
    const { container } = render(<Toast />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the message with the success style by default", () => {
    render(<Toast message="Yadda saxlanildi" />);
    const message = screen.getByText("Yadda saxlanildi");
    expect(message).toBeTruthy();
    expect(message.parentElement.className).toContain("bg-brand-600");
  });

  it("styles error and info toasts differently", () => {
    const { unmount } = render(<Toast message="Xəta" type="error" />);
    expect(screen.getByText("Xəta").parentElement.className).toContain(
      "bg-red-600"
    );
    unmount();
    render(<Toast message="Melumat" type="info" />);
    expect(screen.getByText("Melumat").parentElement.className).toContain(
      "bg-blue-600"
    );
  });

  it("shows a close button only when onClose is given", () => {
    render(<Toast message="Salam" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<Toast message="Salam" onClose={onClose} />);
    screen.getByRole("button").click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
