import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the database module
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateLastSignedIn: vi.fn(),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$12$hashedpassword"),
    compare: vi.fn(),
  },
}));

// Mock sdk
vi.mock("./_core/sdk", () => ({
  createSessionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
}));

import * as db from "./db";
import bcrypt from "bcryptjs";

function createMockContext(): { ctx: TrpcContext; setCookies: CookieCall[]; clearedCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies, clearedCookies };
}

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    email: "sample@example.com",
    firstName: "Sample",
    lastName: "User",
    mobile: null,
    role: "user",
    tier: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    brokerReferral: null,
    smsConsent: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user and sets JWT cookie on success", async () => {
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserByEmail).mockResolvedValue(null);
    vi.mocked(db.createUser).mockResolvedValue({
      id: 1,
      email: "new@example.com",
      passwordHash: "$2b$12$hashedpassword",
      firstName: "New",
      lastName: "User",
      mobile: null,
      role: "user",
      tier: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      brokerReferral: null,
      smsConsent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const result = await caller.auth.signup({
      email: "new@example.com",
      password: "password123",
      firstName: "New",
      lastName: "User",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("new@example.com");
    expect(result.user.firstName).toBe("New");
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
    expect(setCookies[0]?.value).toBe("mock-jwt-token");
  });

  it("rejects signup with existing email", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      email: "existing@example.com",
      passwordHash: "$2b$12$hash",
      firstName: "Existing",
      lastName: null,
      mobile: null,
      role: "user",
      tier: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      brokerReferral: null,
      smsConsent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    await expect(
      caller.auth.signup({
        email: "existing@example.com",
        password: "password123",
        firstName: "Test",
      })
    ).rejects.toThrow("An account with this email already exists");
  });

  it("rejects signup with short password", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.signup({
        email: "test@example.com",
        password: "short",
        firstName: "Test",
      })
    ).rejects.toThrow();
  });
});

describe("auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in with valid credentials and sets JWT cookie", async () => {
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      email: "user@example.com",
      passwordHash: "$2b$12$validhash",
      firstName: "Test",
      lastName: "User",
      mobile: null,
      role: "user",
      tier: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      brokerReferral: null,
      smsConsent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await caller.auth.login({
      email: "user@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("user@example.com");
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
    expect(setCookies[0]?.value).toBe("mock-jwt-token");
    expect(db.updateLastSignedIn).toHaveBeenCalledWith(1);
  });

  it("rejects login with non-existent email", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserByEmail).mockResolvedValue(null);

    await expect(
      caller.auth.login({
        email: "nonexistent@example.com",
        password: "password123",
      })
    ).rejects.toThrow("Invalid email or password");
  });

  it("rejects login with wrong password", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      email: "user@example.com",
      passwordHash: "$2b$12$validhash",
      firstName: "Test",
      lastName: null,
      mobile: null,
      role: "user",
      tier: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      brokerReferral: null,
      smsConsent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      caller.auth.login({
        email: "user@example.com",
        password: "wrongpassword",
      })
    ).rejects.toThrow("Invalid email or password");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("auth.me", () => {
  it("returns null when not authenticated", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("sample@example.com");
    expect(result?.firstName).toBe("Sample");
  });
});
