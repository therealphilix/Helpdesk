import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { EditUserDialog, type EditableUser } from "../EditUserDialog";
import { editUserSchema } from "../../lib/schemas";

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

const mockUser: EditableUser = {
  id: "user-1",
  name: "John Doe",
  email: "john@helpdesk.com",
};

describe("editUserSchema", () => {
  it("accepts valid data without password", () => {
    const result = editUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@helpdesk.com",
      password: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid data with password", () => {
    const result = editUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@helpdesk.com",
      password: "NewP4ssword!!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password that is too short", () => {
    const result = editUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@helpdesk.com",
      password: "Ab1!",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name and email", () => {
    const result = editUserSchema.safeParse({
      name: "  Jane  ",
      email: "  jane@helpdesk.com  ",
      password: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jane");
      expect(result.data.email).toBe("jane@helpdesk.com");
    }
  });
});

describe("EditUserDialog", () => {
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

  function renderDialog(open = true, user: EditableUser = mockUser) {
    return render(
      <EditUserDialog open={open} onOpenChange={onOpenChangeMock as (open: boolean) => void} user={user} />
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
    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();
    expect(screen.getByText("Update the user's information.")).toBeInTheDocument();
  });

  it("pre-populates name and email fields with user data", () => {
    renderDialog(true);
    expect(screen.getByLabelText("Name")).toHaveValue("John Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("john@helpdesk.com");
  });

  it("leaves password field empty by default", () => {
    renderDialog(true);
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("shows placeholder text on password field", () => {
    renderDialog(true);
    expect(screen.getByPlaceholderText("Leave blank to keep current password")).toBeInTheDocument();
  });

  it("renders Cancel and Save Changes buttons", () => {
    renderDialog(true);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("closes when Cancel is clicked", async () => {
    renderDialog(true);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("submits updated name and email without password when password is empty", async () => {
    renderDialog(true);
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Jane Doe");
    await userEvent.clear(screen.getByLabelText("Email"));
    await userEvent.type(screen.getByLabelText("Email"), "jane@helpdesk.com");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(mutateMock).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@helpdesk.com",
      password: "",
    });
  });

  it("submits updated name, email, and password when password is provided", async () => {
    renderDialog(true);
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Jane Doe");
    await userEvent.clear(screen.getByLabelText("Email"));
    await userEvent.type(screen.getByLabelText("Email"), "jane@helpdesk.com");
    await userEvent.type(screen.getByLabelText("Password"), "NewP4ssword!!");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(mutateMock).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@helpdesk.com",
      password: "NewP4ssword!!",
    });
  });

  it("does not submit when form is invalid", async () => {
    renderDialog(true);
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("shows validation error for name shorter than 3 characters", async () => {
    renderDialog(true);
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "ab");
    await userEvent.tab();
    expect(await screen.findByText("Name must be at least 3 characters")).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    renderDialog(true);
    await userEvent.clear(screen.getByLabelText("Email"));
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.tab();
    expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
  });

  it("shows validation error for short password when provided", async () => {
    renderDialog(true);
    await userEvent.type(screen.getByLabelText("Password"), "Ab1!");
    await userEvent.tab();
    expect(await screen.findByText("Password must be at least 12 characters")).toBeInTheDocument();
  });

  it("updates fields when user prop changes", () => {
    const { rerender } = renderDialog(true, mockUser);
    expect(screen.getByLabelText("Name")).toHaveValue("John Doe");
    const newUser: EditableUser = { id: "user-2", name: "Jane Smith", email: "jane@helpdesk.com" };
    rerender(
      <EditUserDialog open={true} onOpenChange={onOpenChangeMock as (open: boolean) => void} user={newUser} />
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Jane Smith");
    expect(screen.getByLabelText("Email")).toHaveValue("jane@helpdesk.com");
  });
});
