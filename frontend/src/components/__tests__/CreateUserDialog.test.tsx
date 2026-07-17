import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { CreateUserDialog, createUserSchema } from "../CreateUserDialog";

const { useMutationMock, useQueryClientMock, invalidateQueriesMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useMutation: (...args: unknown[]) => useMutationMock(...args),
    useQueryClient: () => useQueryClientMock(),
  };
});

describe("createUserSchema", () => {
  it("accepts a valid user", () => {
    const result = createUserSchema.safeParse({
      name: "John Doe",
      email: "john@helpdesk.com",
      password: "StrongP4ssword!",
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from name", () => {
    const result = createUserSchema.safeParse({
      name: "  John  ",
      email: "john@helpdesk.com",
      password: "StrongP4ssword!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
    }
  });

  it("trims whitespace from email", () => {
    const result = createUserSchema.safeParse({
      name: "John",
      email: "  john@helpdesk.com  ",
      password: "StrongP4ssword!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@helpdesk.com");
    }
  });

  it("rejects name shorter than 3 characters", () => {
    const result = createUserSchema.safeParse({
      name: "Jo",
      email: "john@helpdesk.com",
      password: "StrongP4ssword!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name that becomes too short after trimming", () => {
    const result = createUserSchema.safeParse({
      name: "  J  ",
      email: "john@helpdesk.com",
      password: "StrongP4ssword!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createUserSchema.safeParse({
      name: "John",
      email: "not-an-email",
      password: "StrongP4ssword!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 12 characters", () => {
    const result = createUserSchema.safeParse({
      name: "John",
      email: "john@helpdesk.com",
      password: "Ab1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password missing uppercase letter", () => {
    const result = createUserSchema.safeParse({
      name: "John",
      email: "john@helpdesk.com",
      password: "lowercaseonly1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password missing lowercase letter", () => {
    const result = createUserSchema.safeParse({
      name: "John",
      email: "john@helpdesk.com",
      password: "UPPERCASEONLY1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password missing digit", () => {
    const result = createUserSchema.safeParse({
      name: "John",
      email: "john@helpdesk.com",
      password: "NoDigitsHere!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password missing special character", () => {
    const result = createUserSchema.safeParse({
      name: "John",
      email: "john@helpdesk.com",
      password: "NoSpecialChar1",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateUserDialog", () => {
  let mutateMock: ReturnType<typeof vi.fn>;
  let onOpenChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    });
    mutateMock = vi.fn();
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      mutateAsync: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false,
    });
    onOpenChangeMock = vi.fn();
  });

  function renderDialog(open = true) {
    return render(
      <CreateUserDialog open={open} onOpenChange={onOpenChangeMock as (open: boolean) => void} />
    );
  }

  it("renders nothing visible when closed", () => {
    renderDialog(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog when open", () => {
    renderDialog(true);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows dialog title and description", () => {
    renderDialog(true);
    expect(screen.getByRole("heading", { name: "Create User" })).toBeInTheDocument();
    expect(screen.getByText("Add a new user to the helpdesk system.")).toBeInTheDocument();
  });

  it("renders name, email, and password fields", () => {
    renderDialog(true);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders Cancel and submit buttons", () => {
    renderDialog(true);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create User" })).toBeInTheDocument();
  });

  it("calls onOpenChange(false) and does not submit when Cancel is clicked", async () => {
    renderDialog(true);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("shows validation error for name shorter than 3 characters", async () => {
    renderDialog(true);
    const nameInput = screen.getByLabelText("Name");
    await userEvent.type(nameInput, "ab");
    await userEvent.tab();
    expect(await screen.findByText("Name must be at least 3 characters")).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    renderDialog(true);
    const emailInput = screen.getByLabelText("Email");
    await userEvent.type(emailInput, "not-an-email");
    await userEvent.tab();
    expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
  });

  it("shows multiple password validation errors", async () => {
    renderDialog(true);
    const passwordInput = screen.getByLabelText("Password");
    await userEvent.type(passwordInput, "short");
    await userEvent.tab();
    expect(await screen.findByText("Password must be at least 12 characters")).toBeInTheDocument();
  });

  it("shows error for password missing uppercase", async () => {
    renderDialog(true);
    const passwordInput = screen.getByLabelText("Password");
    await userEvent.type(passwordInput, "abcdefghijk1!");
    await userEvent.tab();
    expect(await screen.findByText("Must contain an uppercase letter")).toBeInTheDocument();
  });

  it("shows error for password missing digit", async () => {
    renderDialog(true);
    const passwordInput = screen.getByLabelText("Password");
    await userEvent.type(passwordInput, "Abcdefghijk!");
    await userEvent.tab();
    expect(await screen.findByText("Must contain a digit")).toBeInTheDocument();
  });

  it("shows error for password missing special character", async () => {
    renderDialog(true);
    const passwordInput = screen.getByLabelText("Password");
    await userEvent.type(passwordInput, "Abcdefghijk1");
    await userEvent.tab();
    expect(await screen.findByText("Must contain a special character")).toBeInTheDocument();
  });

  it("submits valid form and calls mutate with correct data", async () => {
    renderDialog(true);
    await userEvent.type(screen.getByLabelText("Name"), "New User");
    await userEvent.type(screen.getByLabelText("Email"), "new@helpdesk.com");
    await userEvent.type(screen.getByLabelText("Password"), "StrongP4ssword!");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(mutateMock).toHaveBeenCalledWith({
      name: "New User",
      email: "new@helpdesk.com",
      password: "StrongP4ssword!",
    });
  });

  it("does not submit when form is invalid", async () => {
    renderDialog(true);
    await userEvent.type(screen.getByLabelText("Name"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("trims whitespace from name and email on submit", async () => {
    renderDialog(true);
    await userEvent.type(screen.getByLabelText("Name"), "  John Doe  ");
    await userEvent.type(screen.getByLabelText("Email"), "  john@helpdesk.com  ");
    await userEvent.type(screen.getByLabelText("Password"), "StrongP4ssword!");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(mutateMock).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@helpdesk.com",
      password: "StrongP4ssword!",
    });
  });
});

