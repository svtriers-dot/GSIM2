import { Router } from "express";
import {
  teamJoinSchema,
  teamMembersUpdateSchema,
} from "@shared/schema";
import type { TeamWithMembers } from "../services/sessions";
import {
  joinSession,
  getTeamByDeviceToken,
  updateTeamMembers,
  touchTeam,
  SessionNotFoundError,
  SessionFullError,
  SessionInvalidPinError,
  SessionInvalidStateError,
  TeamNameTakenError,
} from "../services/sessions";
import { notifyTeamJoined } from "../services/orchestrator";
import { db } from "../db";
import { sessions } from "@shared/schema";
import { eq } from "drizzle-orm";

export const teamsRouter = Router();

// Заголовок устройства, идентифицирующий команду между запросами
const DEVICE_HEADER = "x-device-token";

async function teamFromHeader(req: any): Promise<TeamWithMembers | null> {
  const token = req.headers[DEVICE_HEADER];
  if (!token || typeof token !== "string") return null;
  return getTeamByDeviceToken(token);
}

// --- GET /api/teams/check?code=XXXXXX (pre-check для UX) ---
// Проверяет существование сессии и требуется ли PIN. Без PIN-валидации.
// Защита: возвращает только поверхностную инфо, не раскрывает реквизиты.

teamsRouter.get("/check", async (req, res) => {
  const codeRaw = req.query.code;
  if (typeof codeRaw !== "string" || !/^[A-Z0-9]{6}$/.test(codeRaw.toUpperCase())) {
    return res.status(400).json({ error: "validation" });
  }
  const { getSessionByCode } = await import("../services/sessions");
  const session = await getSessionByCode(codeRaw.toUpperCase());
  if (!session) {
    return res.json({ exists: false });
  }
  res.json({
    exists: true,
    name: session.name,
    status: session.status,
  });
});

// --- POST /api/teams/join -------------------------------------------------

teamsRouter.post("/join", async (req, res) => {
  const parsed = teamJoinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation", details: parsed.error.format() });
  }
  try {
    const team = await joinSession(parsed.data);
    await notifyTeamJoined(team.sessionId, team.id);
    res.json({
      team: {
        id: team.id,
        name: team.name,
        color: team.color,
        deviceToken: team.deviceToken,
        sessionId: team.sessionId,
      },
      members: team.members,
    });
  } catch (e: any) {
    if (e instanceof SessionNotFoundError) {
      return res.status(404).json({ error: "session_not_found" });
    }
    if (e instanceof SessionFullError) {
      return res.status(409).json({ error: "session_full" });
    }
    if (e instanceof SessionInvalidPinError) {
      return res.status(403).json({ error: "invalid_pin" });
    }
    if (e instanceof SessionInvalidStateError) {
      return res.status(409).json({ error: "session_not_accepting", currentStatus: e.sessionStatus });
    }
    if (e instanceof TeamNameTakenError) {
      return res.status(409).json({ error: "team_name_taken" });
    }
    console.error("team join error:", e);
    res.status(500).json({ error: "internal" });
  }
});

// --- GET /api/teams/me ----------------------------------------------------

teamsRouter.get("/me", async (req, res) => {
  const team = await teamFromHeader(req);
  if (!team) return res.status(404).json({ error: "team_not_found" });
  await touchTeam(team.id);
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, team.sessionId))
    .limit(1);
  res.json({
    team: {
      id: team.id,
      name: team.name,
      color: team.color,
      sessionId: team.sessionId,
      factoryState: team.factoryState,
    },
    members: team.members,
    session: session
      ? {
          id: session.id,
          name: session.name,
          accessCode: session.accessCode,
          status: session.status,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          configOverrides: session.configOverrides ?? {},
        }
      : null,
  });
});

// --- POST /api/teams/members (изменить состав команды до старта) ---------

teamsRouter.post("/members", async (req, res) => {
  const team = await teamFromHeader(req);
  if (!team) return res.status(404).json({ error: "team_not_found" });

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, team.sessionId))
    .limit(1);
  if (!session) return res.status(404).json({ error: "session_not_found" });

  // Менять состав можно только в lobby
  if (!["lobby", "draft"].includes(session.status)) {
    return res.status(409).json({ error: "session_started" });
  }

  const parsed = teamMembersUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation" });
  }

  const updated = await updateTeamMembers(team.id, parsed.data.members);
  res.json({ members: updated });
});

// --- POST /api/teams/leave (опционально, для самоухода из лобби) ---------

teamsRouter.post("/leave", async (req, res) => {
  const team = await teamFromHeader(req);
  if (!team) return res.status(404).json({ error: "team_not_found" });
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, team.sessionId))
    .limit(1);
  if (session && session.status !== "lobby") {
    return res.status(409).json({ error: "session_started" });
  }
  const { teams } = await import("@shared/schema");
  await db.delete(teams).where(eq(teams.id, team.id));
  res.json({ ok: true });
});
