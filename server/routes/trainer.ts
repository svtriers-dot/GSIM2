import { Router } from "express";
import { z } from "zod";
import {
  trainerRegisterSchema,
  trainerLoginSchema,
  createSessionSchema,
  broadcastSchema,
  annotateSchema,
  spotlightSchema,
  snapshotSchema,
  kickSchema,
} from "@shared/schema";
import {
  registerTrainer,
  loginTrainer,
  getTrainerById,
  TrainerExistsError,
  InvalidCredentialsError,
} from "../auth/trainer";
import { requireTrainer } from "../middleware/auth";
import {
  notifySessionStateChange,
  notifyTeamJoined,
  broadcastMessage,
  annotateStation,
} from "../services/orchestrator";
import {
  createSession,
  listSessionsForTrainer,
  getSessionForTrainer,
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  resetRound,
  kickTeam,
  listTeamsForSession,
  SessionNotFoundError,
  SessionInvalidStateError,
} from "../services/sessions";

export const trainerRouter = Router();

// --- AUTH -----------------------------------------------------------------

trainerRouter.post("/auth/register", async (req, res) => {
  const parsed = trainerRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation", details: parsed.error.format() });
  }
  try {
    const result = await registerTrainer(parsed.data);
    res.json(result);
  } catch (e: any) {
    if (e instanceof TrainerExistsError) {
      return res.status(409).json({ error: "trainer_exists" });
    }
    console.error("register error:", e);
    res.status(500).json({ error: "internal" });
  }
});

trainerRouter.post("/auth/login", async (req, res) => {
  const parsed = trainerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation" });
  }
  try {
    const result = await loginTrainer(parsed.data);
    res.json(result);
  } catch (e: any) {
    if (e instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    console.error("login error:", e);
    res.status(500).json({ error: "internal" });
  }
});

trainerRouter.get("/auth/me", requireTrainer, async (req, res) => {
  const trainer = await getTrainerById(req.trainer!.sub);
  if (!trainer) return res.status(404).json({ error: "not_found" });
  res.json({ trainer });
});

// --- SESSIONS -------------------------------------------------------------

trainerRouter.get("/sessions", requireTrainer, async (req, res) => {
  const sessions = await listSessionsForTrainer(req.trainer!.sub);
  res.json({ sessions });
});

trainerRouter.post("/sessions", requireTrainer, async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation", details: parsed.error.format() });
  }
  try {
    const session = await createSession(req.trainer!.sub, parsed.data);
    res.json({ session });
  } catch (e: any) {
    console.error("create session error:", e);
    res.status(500).json({ error: "internal" });
  }
});

trainerRouter.get("/sessions/:id", requireTrainer, async (req, res) => {
  const session = await getSessionForTrainer((req.params.id as string), req.trainer!.sub);
  if (!session) return res.status(404).json({ error: "not_found" });
  const teams = await listTeamsForSession(session.id);
  res.json({ session, teams });
});

function withErrorHandler(
  handler: (req: any, res: any) => Promise<void>,
) {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (e: any) {
      if (e instanceof SessionNotFoundError) {
        return res.status(404).json({ error: "not_found" });
      }
      if (e instanceof SessionInvalidStateError) {
        return res
          .status(409)
          .json({ error: "invalid_state", currentStatus: e.sessionStatus, expected: e.expected });
      }
      console.error("session lifecycle error:", e);
      res.status(500).json({ error: "internal" });
    }
  };
}

trainerRouter.post(
  "/sessions/:id/start",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const session = await startSession((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/pause",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const session = await pauseSession((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/resume",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const session = await resumeSession((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/end",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const session = await endSession((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/reset-round",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const round = await resetRound((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange((req.params.id as string));
    res.json({ round });
  }),
);

trainerRouter.post(
  "/sessions/:id/kick",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const parsed = kickSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation" });
    }
    await kickTeam((req.params.id as string), parsed.data.teamId, req.trainer!.sub);
    res.json({ ok: true });
  }),
);

// --- broadcast / annotate / spotlight / snapshot --------------------------
// MVP-1: эндпоинты принимают payload, broadcast пойдёт через WS (см. server/ws/trainer.ts).
// Здесь только запись в trainer_actions для журнала.

import { db } from "../db";
import { trainerActions } from "@shared/schema";

trainerRouter.post(
  "/sessions/:id/broadcast",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const parsed = broadcastSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation" });
    const session = await getSessionForTrainer((req.params.id as string), req.trainer!.sub);
    if (!session) throw new SessionNotFoundError();
    const [action] = await db
      .insert(trainerActions)
      .values({ sessionId: session.id, type: "broadcast", payload: parsed.data })
      .returning();
    broadcastMessage(session.id, parsed.data.message);
    res.json({ action });
  }),
);

trainerRouter.post(
  "/sessions/:id/annotate",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const parsed = annotateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation" });
    const session = await getSessionForTrainer((req.params.id as string), req.trainer!.sub);
    if (!session) throw new SessionNotFoundError();
    const [action] = await db
      .insert(trainerActions)
      .values({ sessionId: session.id, type: "annotate", payload: parsed.data })
      .returning();
    annotateStation(session.id, parsed.data.stationId, parsed.data.text, parsed.data.durationMs);
    res.json({ action });
  }),
);

trainerRouter.post(
  "/sessions/:id/spotlight",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const parsed = spotlightSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation" });
    const session = await getSessionForTrainer((req.params.id as string), req.trainer!.sub);
    if (!session) throw new SessionNotFoundError();
    const [action] = await db
      .insert(trainerActions)
      .values({ sessionId: session.id, type: "spotlight", payload: parsed.data })
      .returning();
    res.json({ action });
  }),
);

trainerRouter.post(
  "/sessions/:id/snapshot",
  requireTrainer,
  withErrorHandler(async (req, res) => {
    const parsed = snapshotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation" });
    const session = await getSessionForTrainer((req.params.id as string), req.trainer!.sub);
    if (!session) throw new SessionNotFoundError();
    // Snapshot обычно фиксирует state — пока без игрового движка кладём только пустой объект
    // TODO: orchestrator должен дать актуальный state всех команд
    const teams = await listTeamsForSession(session.id);
    const state = {
      teams: teams.map((t) => ({ id: t.id, name: t.name, factoryState: t.factoryState })),
    };
    const { snapshots } = await import("@shared/schema");
    const [snap] = await db
      .insert(snapshots)
      .values({
        sessionId: session.id,
        createdBy: req.trainer!.sub,
        state,
        label: parsed.data.label,
      })
      .returning();
    res.json({ snapshot: snap });
  }),
);
