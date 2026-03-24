import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  overrides: Partial<ToolInvocation> & { toolName: string; args: Record<string, unknown> }
): ToolInvocation {
  return {
    toolCallId: "test-id",
    state: "call",
    ...overrides,
  } as ToolInvocation;
}

test("str_replace_editor create in-progress shows spinner and Creating label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      })}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
});

test("str_replace_editor create completed shows green dot and no spinner", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      })}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(document.querySelector(".animate-spin")).toBeNull();
  expect(document.querySelector(".bg-emerald-500")).not.toBeNull();
});

test("str_replace_editor str_replace shows Editing label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/components/Button.tsx" },
      })}
    />
  );

  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("str_replace_editor insert shows Editing label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/components/Button.tsx" },
      })}
    />
  );

  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("str_replace_editor view shows Viewing label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "str_replace_editor",
        args: { command: "view", path: "/App.jsx" },
      })}
    />
  );

  expect(screen.getByText("Viewing App.jsx")).toBeDefined();
});

test("file_manager rename shows Renaming label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "rename", path: "/App.jsx", new_path: "/Main.jsx" },
      })}
    />
  );

  expect(screen.getByText("Renaming App.jsx")).toBeDefined();
});

test("file_manager delete shows Deleting label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "delete", path: "/App.jsx" },
      })}
    />
  );

  expect(screen.getByText("Deleting App.jsx")).toBeDefined();
});

test("unknown tool falls back to tool name", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "some_other_tool",
        args: {},
      })}
    />
  );

  expect(screen.getByText("some_other_tool")).toBeDefined();
});

test("partial-call with empty args falls back to tool name", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "str_replace_editor",
        args: {},
        state: "partial-call",
      })}
    />
  );

  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("nested path shows only the basename", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "str_replace_editor",
        args: { command: "create", path: "@/components/ui/Button.tsx" },
      })}
    />
  );

  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});
