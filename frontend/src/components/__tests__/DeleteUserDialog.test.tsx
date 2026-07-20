import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DeleteUserDialog, type DeletableUser } from "../DeleteUserDialog";
import { UserRole } from "../../lib/roles";

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

const mockAgent: DeletableUser = {
  id: "user-1",
  name: "John Doe",
  role: UserRole.AGENT,
};

const mockAdmin: DeletableUser = {
  id: "admin-1",
  name: "Admin User",
  role: UserRole.ADMIN,
};

describe("DeleteUserDialog", () => {
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
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    });
    onOpenChangeMock = vi.fn();
  });

  function renderDialog(open = true, user: DeletableUser = mockAgent) {
    return render(
      <DeleteUserDialog open={open} onOpenChange={onOpenChangeMock as (open: boolean) => void} user={user} />
    );
  }

  it("renders nothing visible when closed", () => {
    renderDialog(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog when open for an agent user", () => {
    renderDialog(true, mockAgent);
    expect(screen.getByRole("heading", { name: "Delete User" })).toBeInTheDocument();
  });

  it("shows deactivation description for agent user", () => {
    renderDialog(true, mockAgent);
    expect(screen.getByText("This will deactivate the user's account and invalidate all their active sessions.")).toBeInTheDocument();
  });

  it("shows the user name in the confirmation text", () => {
    renderDialog(true, mockAgent);
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders Cancel and Delete buttons for agent user", () => {
    renderDialog(true, mockAgent);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("closes when Cancel is clicked", async () => {
    renderDialog(true, mockAgent);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("calls delete mutation when Delete is clicked", async () => {
    renderDialog(true, mockAgent);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(mutateMock).toHaveBeenCalled();
  });

  it("shows admin blocked message and no delete button for admin user", () => {
    renderDialog(true, mockAdmin);
    expect(screen.getByText("Admin users cannot be deleted.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("renders Close button instead of Cancel for admin user", () => {
    renderDialog(true, mockAdmin);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("does not show confirmation text for admin user", () => {
    renderDialog(true, mockAdmin);
    expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument();
  });

  it("disables buttons while deleting", () => {
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      mutateAsync: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
      isSuccess: false,
    });
    renderDialog(true, mockAgent);
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeInTheDocument();
  });

  it("shows error alert when deletion fails", () => {
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: true,
      error: { response: { data: { detail: "Server error" } } },
      isSuccess: false,
    });
    renderDialog(true, mockAgent);
    expect(screen.getByRole("alert")).toHaveTextContent("Server error");
  });
});
