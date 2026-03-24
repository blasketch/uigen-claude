import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

describe("useAuth", () => {
  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("calls signIn action with email and password", async () => {
      mockSignIn.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("returns the result from signIn action", async () => {
      const mockResult = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(mockResult);
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("sets isLoading to true while running and false when done", async () => {
      let resolveSignIn!: (v: unknown) => void;
      mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when action throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not call handlePostSignIn when signIn fails", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Bad credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("calls handlePostSignIn when signIn succeeds", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });
  });

  describe("signUp", () => {
    test("calls signUp action with email and password", async () => {
      mockSignUp.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
    });

    test("returns the result from signUp action", async () => {
      const mockResult = { success: true };
      mockSignUp.mockResolvedValue(mockResult);
      mockGetProjects.mockResolvedValue([{ id: "p1" }]);
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "password");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("sets isLoading to true while running and false when done", async () => {
      let resolveSignUp!: (v: unknown) => void;
      mockSignUp.mockReturnValue(new Promise((r) => (resolveSignUp = r)));
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("new@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when action throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Server error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not call handlePostSignIn when signUp fails", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("taken@example.com", "password");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("calls handlePostSignIn when signUp succeeds", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });
  });

  describe("handlePostSignIn — anonymous work exists", () => {
    test("creates a project with anon messages and file system data", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Make a button" }],
        fileSystemData: { "/App.jsx": { content: "..." } },
      };
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockSignIn.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
    });

    test("project name includes the current time", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: {},
      });
      mockSignIn.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      const [{ name }] = mockCreateProject.mock.calls[0];
      expect(name).toMatch(/^Design from /);
    });

    test("clears anon work after creating the project", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: {},
      });
      mockSignIn.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockClearAnonWork).toHaveBeenCalledOnce();
    });

    test("navigates to the newly created project", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: {},
      });
      mockSignIn.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("does not call getProjects when anon work exists with messages", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: {},
      });
      mockSignIn.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — anon work has no messages", () => {
    test("falls through to getProjects when anon work has empty messages", async () => {
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "recent-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/recent-project");
    });

    test("does not create a project from anon work when messages are empty", async () => {
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "recent-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anon work, existing projects", () => {
    test("navigates to the most recent project", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([
        { id: "most-recent" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/most-recent");
    });

    test("does not create a new project when existing projects are found", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anon work, no existing projects", () => {
    test("creates a new empty project", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
    });

    test("new project name matches 'New Design #<number>' pattern", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      const [{ name }] = mockCreateProject.mock.calls[0];
      expect(name).toMatch(/^New Design #\d+$/);
    });

    test("navigates to the newly created project", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/brand-new");
    });
  });
});
