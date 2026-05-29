import type { Express } from "express";

/**
 * OAuth routes removed - using JWT email/password auth instead.
 * This function is kept as a no-op to avoid breaking the server bootstrap.
 */
export function registerOAuthRoutes(app: Express) {
  // No-op: OAuth has been replaced with JWT auth
}
