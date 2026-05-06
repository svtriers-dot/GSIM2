import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES_IN = "7d";

if (process.env.NODE_ENV === "production" && SECRET === "dev-secret-change-me") {
  console.error("[FATAL] JWT_SECRET не задан в production!");
}

export interface TrainerJwtPayload {
  sub: string; // trainer.id
  email: string;
  iat?: number;
  exp?: number;
}

export function signTrainerToken(payload: { id: string; email: string }): string {
  return jwt.sign({ sub: payload.id, email: payload.email }, SECRET, {
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
