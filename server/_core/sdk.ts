import { SignJWT } from "jose";
import { ENV } from "./env";
import { ONE_YEAR_MS } from "../../shared/const";

/**
 * JWT Auth Helper - signs session tokens for authenticated users.
 * No external OAuth provider needed.
 */

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

/**
 * Create a JWT session token for a user.
 */
export async function createSessionToken(
  userId: number,
  email: string,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    userId,
    email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}
