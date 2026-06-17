import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertGameResultSchema } from "@shared/schema";
import { trainerRouter } from "./routes/trainer";
import { teamsRouter } from "./routes/teams";
import { adminRouter } from "./routes/admin";
import { verifyRouter } from "./routes/verify";
import { setupWebSocket } from "./ws";
import { getActiveStats } from "./services/orchestrator";
import { db } from "./db";
import { sql } from "drizzle-orm";

const SERVER_STARTED_AT = Date.now();

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

  // --- Наблюдаемость: health + клиентский конфиг (без авторизации, лёгкие) ---

  app.get("/api/health", async (_req, res) => {
    let dbOk = false;
    try {
      await db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch (e) {
      console.error("[health] db check failed:", e);
    }
    const stats = getActiveStats();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      uptimeSec: Math.round((Date.now() - SERVER_STARTED_AT) / 1000),
      version: process.env.SENTRY_RELEASE || process.env.APP_VERSION || "dev",
      db: dbOk ? "ok" : "fail",
      activeSessions: stats.sessions,
      activeTeams: stats.teams,
      trainerSockets: stats.trainerSockets,
      ts: new Date().toISOString(),
    });
  });

  // Клиентский Sentry DSN отдаётся в рантайме (DSN клиента не секрет — он всё равно
  // в JS), чтобы не завязывать сборку клиента на build-time env.
  app.get("/api/client-config", (_req, res) => {
    res.json({
      sentryDsn: process.env.SENTRY_DSN_CLIENT || null,
      release: process.env.SENTRY_RELEASE || null,
      environment: process.env.NODE_ENV || "production",
    });
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
