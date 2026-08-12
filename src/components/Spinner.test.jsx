import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Spinner from "./Spinner";

describe("Spinner", () => {
  it("defaults to a 32px spinner without a label", () => {
    const { container } = render(<Spinner />);
    const circle = container.querySelector(".animate-spin");
    expect(circle.style.width).toBe("32px");
    expect(circle.style.height).toBe("32px");
    expect(container.querySelector("p")).toBeNull();
  });

  it("honours the size prop and renders the label", () => {
    const { container } = render(<Spinner size={64} label="Yüklenir" />);
    expect(container.querySelector(".animate-spin").style.width).toBe("64px");
    expect(screen.getByText("Yüklenir")).toBeTruthy();
  });
});
