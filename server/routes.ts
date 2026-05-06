import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertGameResultSchema } from "@shared/schema";
import { trainerRouter } from "./routes/trainer";
import { teamsRouter } from "./routes/teams";
import { adminRouter } from "./routes/admin";
import { verifyRouter } from "./routes/verify";
import { setupWebSocket } from "./ws";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // --- legacy: индивидуальный режим (НЕ ТРОГАТЬ) ---

  app.post("/api/game-results", async (req, res) => {
    const parsed = insertGameResultSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const result = await storage.saveGameResult(parsed.data);
    res.json(result);
  });

  app.get("/api/game-results", async (_req, res) => {
    const results = await storage.getTopGameResults(20);
    res.json(results);
  });

  // --- ТРЕНЕРСКИЙ РЕЖИМ (ADR-002) ---

  app.use("/api/trainer", trainerRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/verify", verifyRouter);

  // --- WebSocket (тренер + команды) ---

  setupWebSocket(httpServer);

  return httpServer;
}
