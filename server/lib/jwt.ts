import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES_IN = "1h"; // MVP-2 Security: окно компрометации 1 час, auto-refresh через /auth/me

if (process.env.NODE_ENV === "production" && SECRET === "dev-secret-change-me") {
  console.error("[FATAL] JWT_SECRET не задан в production!");
}

export type TrainerRole = "pending" | "active" | "suspended" | "rejected" | "super_admin";

export interface TrainerJwtPayload {
  sub: string; // trainer.id
  email: string;
  role: TrainerRole;
  iat?: number;
  exp?: number;
}

export function signTrainerToken(payload: { id: string; email: string; role: TrainerRole }): string {
  return jwt.sign({ sub: payload.id, email: payload.email, role: payload.role }, SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

export function verifyTrainerToken(token: string): TrainerJwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as TrainerJwtPayload;
  } catch {
    return null;
  }
}
