// MVP-2 Security: маскировка чувствительных полей в логах.
// Используется в request-logger middleware (server/index.ts).

const SENSITIVE_KEYS = new Set([
  "token",
  "accessToken",
  "refreshToken",
  "password",
  "newPassword",
  "passwordHash",
  "password_hash",
  "notes", // может содержать причины reject/suspend, не нужно в общих логах
  "secret",
  "client_secret",
  "Authorization",
  "authorization",
]);

const MAX_VALUE_LEN = 200;
const MAX_DEPTH = 5;

export function sanitizeForLog(input: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated:depth]";
  if (input === null || input === undefined) return input;
  if (typeof input === "string") {
    return input.length > MAX_VALUE_LEN ? input.slice(0, MAX_VALUE_LEN) + "…" : input;
  }
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) {
    return input.slice(0, 20).map((v) => sanitizeForLog(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = "[redacted]";
    } else {
      out[k] = sanitizeForLog(v, depth + 1);
    }
  }
  return out;
}
