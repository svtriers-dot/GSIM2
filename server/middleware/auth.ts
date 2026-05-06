import type { Request, Response, NextFunction } from "express";
import { verifyTrainerToken, type TrainerJwtPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      trainer?: TrainerJwtPayload;
    }
  }
}

export function requireTrainer(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_authorization" });
  }
  const token = header.slice(7);
  const payload = verifyTrainerToken(token);
  if (!payload) {
    return res.status(401).json({ error: "invalid_token" });
  }
  req.trainer = payload;
  next();
}
