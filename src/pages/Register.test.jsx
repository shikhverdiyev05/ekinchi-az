import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register";
import { useAuth } from "../context/AuthContext";
import { REGIONS } from "../utils/constants";

const navigate = vi.fn();

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const register = vi.fn();

function renderRegister() {
  const utils = render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
  const inputs = utils.container.querySelectorAll("input");
  return {
    ...utils,
    fullName: inputs[0],
    email: utils.container.querySelector('input[type="email"]'),
    password: utils.container.querySelector('input[type="password"]'),
    phone: inputs[3],
    region: utils.container.querySelector("select"),
    submitButton: screen.getByRole("button"),
  };
}

function fill(view, values) {
  fireEvent.change(view.fullName, { target: { value: values.fullName } });
  fireEvent.change(view.email, { target: { value: values.email } });
  fireEvent.change(view.password, { target: { value: values.password } });
  if (values.phone !== undefined)
    fireEvent.change(view.phone, { target: { value: values.phone } });
  if (values.region !== undefined)
    fireEvent.change(view.region, { target: { value: values.region } });
}

const validForm = {
  fullName: "Ali Aliyev",
  email: "ali@example.com",
  password: "pw1234",
  phone: "+994 50 000 00 00",
  region: "Bakı",
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ register });
});

describe("Register", () => {
  it("offers every region plus a placeholder option", () => {
    const view = renderRegister();
    expect(view.region.options).toHaveLength(REGIONS.length + 1);
    expect(view.region.value).toBe("");
  });

  it("rejects a password shorter than 6 characters without calling the API", async () => {
    const view = renderRegister();
    fill(view, { ...validForm, password: "pw12" });
    fireEvent.click(view.submitButton);
    await waitFor(() =>
      expect(
        screen.getByText("Şifrə ən azından 6 simvoldan ibarət olmalıdır")
      ).toBeTruthy()
    );
    expect(register).not.toHaveBeenCalled();
    expect(view.submitButton.disabled).toBe(false);
  });

  it("submits the whole form and navigates home on success", async () => {
    register.mockResolvedValue({ id: "u_new" });
    const view = renderRegister();
    fill(view, validForm);
    fireEvent.click(view.submitButton);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
    expect(register).toHaveBeenCalledWith(validForm);
  });

  it("shows a busy label while the request is in flight", async () => {
    let resolve;
    register.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = renderRegister();
    fill(view, validForm);
    fireEvent.click(view.submitButton);
    await waitFor(() =>
      expect(view.submitButton.textContent).toBe("Yaradılır...")
    );
    resolve({ id: "u_new" });
    await waitFor(() => expect(view.submitButton.disabled).toBe(false));
  });

  it("shows the failure message and stays on the page", async () => {
    register.mockRejectedValue(new Error("Bu email artıq istifade olunur"));
    const view = renderRegister();
    fill(view, validForm);
    fireEvent.click(view.submitButton);
    await waitFor(() =>
      expect(screen.getByText("Bu email artıq istifade olunur")).toBeTruthy()
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
