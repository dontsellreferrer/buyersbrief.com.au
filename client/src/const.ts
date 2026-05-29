export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the login page path.
 * Previously pointed to Manus OAuth — now uses local JWT auth.
 */
export const getLoginUrl = () => "/login";
