import { Router } from "express";
import { eq, and } from "drizzle-orm";
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
  TrainerRejectedError,
} from "../auth/trainer";
import { requireTrainer, requireActiveTrainer } from "../middleware/auth";
import {
  notifySessionStateChange,
  notifyTeamJoined,
  broadcastMessage,
  annotateStation,
  finalizeRoundResults,
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
    if (e instanceof TrainerRejectedError) {
      return res.status(403).json({ error: "rejected" });
    }
    console.error("login error:", e);
    res.status(500).json({ error: "internal" });
  }
});

trainerRouter.get("/auth/me", requireTrainer, async (req, res) => {
  const trainer = await getTrainerById(req.trainer!.sub);
  if (!trainer) return res.status(404).json({ error: "not_found" });
  // Возвращаем СВЕЖИЙ токен с актуальной ролью — фронт перезапишет localStorage.
  // Это решает проблему stale-JWT после смены роли (approve / reject / suspend)
  // или после миграции, когда старые токены могли не содержать поля role.
  const { signTrainerToken } = await import("../lib/jwt");
  const token = signTrainerToken({
    id: trainer.id,
    email: trainer.email,
    role: (trainer.role ?? "pending") as any,
  });
  res.json({ trainer, token });
});

// --- SESSIONS -------------------------------------------------------------

trainerRouter.get("/sessions", requireActiveTrainer, async (req, res) => {
  const sessions = await listSessionsForTrainer(req.trainer!.sub);
  res.json({ sessions });
});

trainerRouter.post("/sessions", requireActiveTrainer, async (req, res) => {
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

trainerRouter.get("/sessions/:id", requireActiveTrainer, async (req, res) => {
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
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const session = await startSession((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/pause",
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const session = await pauseSession((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/resume",
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const session = await resumeSession((req.params.id as string), req.trainer!.sub);
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/end",
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const session = await endSession((req.params.id as string), req.trainer!.sub);
    // Финализируем результаты ТЕКУЩЕГО раунда (если был) до изменения статуса в БД
    const allRounds = await db.select().from(rounds).where(eq(rounds.sessionId, session.id));
    const lastRound = allRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];
    if (lastRound) {
      await finalizeRoundResults(session.id, lastRound.id);
    }
    await notifySessionStateChange(session.id);
    res.json({ session });
  }),
);

trainerRouter.post(
  "/sessions/:id/reset-round",
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const round = await resetRound((req.params.id as string), req.trainer!.sub);
    // Финализируем предыдущий раунд (тот что был ended в resetRound)
    const prevRounds = await db.select().from(rounds).where(eq(rounds.sessionId, (req.params.id as string)));
    const prevEnded = prevRounds
      .filter((r) => r.status === "ended")
      .sort((a, b) => b.roundNumber - a.roundNumber)[0];
    if (prevEnded) {
      await finalizeRoundResults((req.params.id as string), prevEnded.id);
    }
    await notifySessionStateChange((req.params.id as string));
    res.json({ round });
  }),
);

trainerRouter.post(
  "/sessions/:id/kick",
  requireActiveTrainer,
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
import {
  trainerActions,
  rounds,
  teamRoundResults,
  decisions as decisionsTable,
  snapshots as snapshotsTable,
  teams as teamsTable,
  teamMembers as teamMembersTable,
} from "@shared/schema";
import { desc, asc, inArray } from "drizzle-orm";

trainerRouter.post(
  "/sessions/:id/broadcast",
  requireActiveTrainer,
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
  requireActiveTrainer,
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
  requireActiveTrainer,
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
  requireActiveTrainer,
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

// =============================================================================
// MVP-2.B Дебриф — replay, round comparison, snapshots
// =============================================================================

// GET /api/trainer/sessions/:id/rounds — все раунды + результаты команд
trainerRouter.get(
  "/sessions/:id/rounds",
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const sessionId = req.params.id as string;
    const session = await getSessionForTrainer(sessionId, req.trainer!.sub);
    if (!session) throw new SessionNotFoundError();

    const allRounds = await db
      .select()
      .from(rounds)
      .where(eq(rounds.sessionId, sessionId))
      .orderBy(asc(rounds.roundNumber));

    if (allRounds.length === 0) {
      res.json({ rounds: [], teams: [], results: [] });
      return;
    }

    const sessionTeams = await db.select().from(teamsTable).where(eq(teamsTable.sessionId, sessionId));
    const teamIds = sessionTeams.map((t) => t.id);

    const memberRows = teamIds.length
      ? await db.select().from(teamMembersTable).where(inArray(teamMembersTable.teamId, teamIds))
      : [];

    const results = await db
      .select()
      .from(teamRoundResults)
      .where(inArray(teamRoundResults.roundId, allRounds.map((r) => r.id)));

    res.json({
      rounds: allRounds,
      teams: sessionTeams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        members: memberRows.filter((m) => m.teamId === t.id).map((m) => m.fullName),
      })),
      results,
    });
  }),
);

// GET /api/trainer/sessions/:id/teams/:teamId/replay
trainerRouter.get(
  "/sessions/:id/teams/:teamId/replay",
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const sessionId = req.params.id as string;
    const teamId = req.params.teamId as string;
    const session = await getSessionForTrainer(sessionId, req.trainer!.sub);
    if (!session) throw new SessionNotFoundError();

    // Проверка что команда в этой сессии
    const [team] = await db
      .select()
      .from(teamsTable)
      .where(and(eq(teamsTable.id, teamId), eq(teamsTable.sessionId, sessionId)))
      .limit(1);
    if (!team) {
      res.status(404).json({ error: "team_not_found" });
      return;
    }

    const allRounds = await db
      .select()
      .from(rounds)
      .where(eq(rounds.sessionId, sessionId))
      .orderBy(asc(rounds.roundNumber));

    const allDecisions = allRounds.length
      ? await db
          .select()
          .from(decisionsTable)
          .where(
            and(
              eq(decisionsTable.teamId, teamId),
              inArray(decisionsTable.roundId, allRounds.map((r) => r.id)),
            ),
          )
          .orderBy(asc(decisionsTable.timestamp))
      : [];

    const teamResults = allRounds.length
      ? await db
          .select()
          .from(teamRoundResults)
          .where(
            and(
              eq(teamRoundResults.teamId, teamId),
              inArray(teamRoundResults.roundId, allRounds.map((r) => r.id)),
            ),
          )
      : [];

    res.json({
      team: { id: team.id, name: team.name, color: team.color },
      rounds: allRounds,
      decisions: allDecisions,
      results: teamResults,
    });
  }),
);

// GET /api/trainer/sessions/:id/snapshots
trainerRouter.get(
  "/sessions/:id/snapshots",
  requireActiveTrainer,
  withErrorHandler(async (req, res) => {
    const sessionId = req.params.id as string;
    const session = await getSessionForTrainer(sessionId, req.trainer!.sub);
    if (!session) throw new SessionNotFoundError();

    const rows = await db
      .select()
      .from(snapshotsTable)
      .where(eq(snapshotsTable.sessionId, sessionId))
      .orderBy(desc(snapshotsTable.createdAt));

    res.json({ snapshots: rows });
  }),
);

