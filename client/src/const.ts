export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the login page path.
 * Uses the local login page for JWT-based authentication.
 */
export const getLoginUrl = () => "/login";
