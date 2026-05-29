import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import * as db from "../db";
import { ENV } from "./env";

export type SafeUser = Omit<User, "passwordHash">;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SafeUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: SafeUser | null = null;

  try {
    const cookieHeader = opts.req.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookieHeader(cookieHeader);
      const token = cookies[COOKIE_NAME];
      if (token) {
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
        const userId = payload.userId as number | undefined;
        if (userId) {
          const dbUser = await db.getUserById(userId);
          if (dbUser) {
            const { passwordHash: _, ...safeUser } = dbUser;
            user = safeUser as SafeUser;
          }
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
