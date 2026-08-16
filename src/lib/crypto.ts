import crypto from "crypto";

/**
 * AES-256-GCM encryption for provider credentials stored in the database.
 * The encryption key is derived from SESSION_SECRET.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET ??
    "votewise_dev_secret_change_in_production_min_32_chars_long";
  // Derive a 32-byte key from the secret using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !authTagHex || !encrypted) return "";
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

export function encryptJSON(obj: Record<string, string>): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptJSON<T = Record<string, string>>(encrypted: string): T {
  const decrypted = decrypt(encrypted);
  if (!decrypted) return {} as T;
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return {} as T;
  }
}
