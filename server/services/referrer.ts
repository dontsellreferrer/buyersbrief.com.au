import crypto from "crypto";

const REFERRER_API_URL = process.env.REFERRER_API_URL || "https://referrer.com.au/api/platform";
const REFERRER_API_KEY = process.env.REFERRER_API_KEY_BB || "";
const REFERRER_ENCRYPT_KEY = process.env.REFERRER_ENCRYPT_KEY || "";

/**
 * Encrypts data using AES-256-CBC for secure transfer to Referrer
 */
function encrypt(text: string): string {
  if (!REFERRER_ENCRYPT_KEY) {
    console.warn("[Referrer] REFERRER_ENCRYPT_KEY not configured, sending plain text (not recommended)");
    return text;
  }
  
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(REFERRER_ENCRYPT_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error("[Referrer] Encryption failed", err);
    return text;
  }
}

/**
 * Pushes a T3 Concierge lead to Referrer
 */
export async function pushConciergeLead(payload: {
  client_name: string;
  client_email: string;
  client_mobile: string;
  property_address: string;
  max_price: number;
  source_ref_id: string;
}) {
  if (!REFERRER_API_KEY) {
    console.warn("[Referrer] REFERRER_API_KEY_BB not configured, skipping lead push");
    return { success: false, error: "Integration not configured" };
  }

  try {
    const response = await fetch(`${REFERRER_API_URL}/concierge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${REFERRER_API_KEY}`
      },
      body: JSON.stringify({
        name: payload.client_name,
        email: payload.client_email,
        phone: payload.client_mobile,
        address: payload.property_address,
        max_price: encrypt(payload.max_price.toString()),
        source_ref_id: payload.source_ref_id,
        source: "buyersbrief-subscriber"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Referrer] Failed to push concierge lead", message);
    return { success: false, error: message };
  }
}
