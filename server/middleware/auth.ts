import type { Request, Response, NextFunction } from "express";
import { verifyTrainerToken, type TrainerJwtPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      trainer?: TrainerJwtPayload;
    }
  }
}

// Любой авторизованный тренер (включая pending) — для просмотра /auth/me, /pending страницы
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
  if (payload.role === "rejected" || payload.role === "suspended") {
    return res.status(403).json({ error: payload.role });
  }
  req.trainer = payload;
  next();
}

// Только тренеры с правом вести сессии — active или super_admin
export function requireActiveTrainer(req: Request, res: Response, next: NextFunction) {
  requireTrainer(req, res, () => {
    const role = req.trainer?.role;
    if (role !== "active" && role !== "super_admin") {
      return res.status(403).json({ error: "approval_required", currentRole: role });
    }
    next();
  });
}

// Только суперадмин
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireTrainer(req, res, () => {
    if (req.trainer?.role !== "super_admin") {
      return res.status(403).json({ error: "super_admin_required" });
    }
    next();
  });
}
