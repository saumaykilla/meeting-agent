const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

export async function hashPassword(email: string, password: string): Promise<string> {
  const normalized = `${email.trim().toLowerCase()}:${password}`;
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function generateTemporaryPassword(length = 14): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values)
    .map((value) => TEMP_PASSWORD_CHARS[value % TEMP_PASSWORD_CHARS.length])
    .join("");
}
