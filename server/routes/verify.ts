// MVP-2 Onboarding: публичная верификация сертификата
// GET /api/verify/:publicId — без auth, возвращает { valid, trainerName, ... }

import { Router } from "express";
import { verifyCertification } from "../services/onboarding";

export const verifyRouter = Router();

// Простой rate-limit для защиты от перебора publicId (хоть он и 12 chars)
import rateLimit from "express-rate-limit";
const verifyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded" },
});

verifyRouter.get("/:publicId", verifyRateLimit, async (req, res) => {
  const publicId = req.params.publicId as string;
  if (!/^[A-Za-z0-9]{6,16}$/.test(publicId)) {
    return res.status(400).json({ error: "invalid_id" });
  }
  const result = await verifyCertification(publicId);
  res.json(result);
});
