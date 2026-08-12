import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import { useAuth } from "../context/AuthContext";

const navigate = vi.fn();

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const login = vi.fn();

function renderLogin() {
  const utils = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  const email = utils.container.querySelector('input[type="email"]');
  const password = utils.container.querySelector('input[type="password"]');
  const submitButton = screen.getByRole("button");
  return { ...utils, email, password, submitButton };
}

function fillAndSubmit({ email, password, submitButton }, values) {
  fireEvent.change(email, { target: { value: values.email } });
  fireEvent.change(password, { target: { value: values.password } });
  fireEvent.click(submitButton);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ login });
});

describe("Login", () => {
  it("renders an empty form with a link to registration", () => {
    const view = renderLogin();
    expect(view.email.value).toBe("");
    expect(view.password.value).toBe("");
    expect(view.submitButton.textContent).toBe("Daxil ol");
    expect(
      screen.getByRole("link", { name: "Qeydiyyatdan keç" }).getAttribute("href")
    ).toBe("/register");
  });

  it("submits the trimmed email and navigates home on success", async () => {
    login.mockResolvedValue({ id: "u_me" });
    const view = renderLogin();
    fillAndSubmit(view, { email: "  a@b.c  ", password: "pw123" });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
    expect(login).toHaveBeenCalledWith("a@b.c", "pw123");
  });

  it("shows a busy label while the request is in flight", async () => {
    let resolve;
    login.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = renderLogin();
    fillAndSubmit(view, { email: "a@b.c", password: "pw123" });
    await waitFor(() =>
      expect(view.submitButton.textContent).toBe("Giriş edilir...")
    );
    expect(view.submitButton.disabled).toBe(true);
    resolve({ id: "u_me" });
    await waitFor(() => expect(view.submitButton.disabled).toBe(false));
  });

  it("shows the failure message and stays on the page", async () => {
    login.mockRejectedValue(new Error("Email və ya şifrə yanlışdır"));
    const view = renderLogin();
    fillAndSubmit(view, { email: "a@b.c", password: "wrong" });
    await waitFor(() =>
      expect(screen.getByText("Email və ya şifrə yanlışdır")).toBeTruthy()
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("clears a previous error on the next attempt", async () => {
    login.mockRejectedValueOnce(new Error("Xəta"));
    const view = renderLogin();
    fillAndSubmit(view, { email: "a@b.c", password: "wrong" });
    await waitFor(() => expect(screen.getByText("Xəta")).toBeTruthy());
    login.mockResolvedValueOnce({ id: "u_me" });
    fireEvent.click(view.submitButton);
    await waitFor(() => expect(screen.queryByText("Xəta")).toBeNull());
  });
});
