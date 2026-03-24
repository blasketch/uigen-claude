// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

// Mock server-only so it doesn't throw outside Next.js server context
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie with a signed JWT", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];

    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("JWT payload contains userId and email", async () => {
    await createSession("user-1", "user@example.com");

    const token = mockCookieStore.set.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({
      userId: "user-1",
      email: "user@example.com",
      expiresAt: new Date(),
    });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("user@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-1", email: "user@example.com" },
      "-1s"
    );
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });

    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  function makeRequest(token?: string) {
    const req = new NextRequest("http://localhost/");
    if (token) {
      req.cookies.set("auth-token", token);
    }
    return req;
  }

  test("returns null when no cookie is present", async () => {
    const session = await verifySession(makeRequest());
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({
      userId: "user-2",
      email: "other@example.com",
      expiresAt: new Date(),
    });

    const session = await verifySession(makeRequest(token));
    expect(session?.userId).toBe("user-2");
    expect(session?.email).toBe("other@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-2", email: "other@example.com" },
      "-1s"
    );

    const session = await verifySession(makeRequest(token));
    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    const session = await verifySession(makeRequest("bad.token.value"));
    expect(session).toBeNull();
  });
});
