import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("falls back to the default title and renders no message or action", () => {
    render(<EmptyState />);
    expect(screen.getByRole("heading").textContent).toBe(
      "Heç bir melumat yoxdur"
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a custom title, message and action", () => {
    render(
      <EmptyState
        title="Elan yoxdur"
        message="Yeni elan elave edin"
        action={<button type="button">Elan yarat</button>}
      />
    );
    expect(screen.getByRole("heading").textContent).toBe("Elan yoxdur");
    expect(screen.getByText("Yeni elan elave edin")).toBeTruthy();
    expect(screen.getByRole("button").textContent).toBe("Elan yarat");
  });
});
