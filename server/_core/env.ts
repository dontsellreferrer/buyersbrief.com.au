export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Forge/Manus APIs — kept as empty strings for now so existing _core helpers
  // don't crash at import time. These will be replaced with direct API keys
  // (e.g. OPENAI_API_KEY) as features are built out.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
