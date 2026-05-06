import { db } from "../db";
import {
  sessions,
  teams,
  teamMembers,
  rounds,
  type Session,
  type Team,
  type TeamMember,
  type Round,
} from "@shared/schema";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { generateAccessCode, pickTeamColor } from "../lib/codes";
import type { CreateSessionInput, TeamJoinInput } from "@shared/schema";

export class SessionNotFoundError extends Error {
  constructor() {
    super("session_not_found");
  }
}

export class SessionFullError extends Error {
  constructor() {
    super("session_full");
  }
}

export class SessionInvalidPinError extends Error {
  constructor() {
    super("invalid_pin");
  }
}

export class SessionInvalidStateError extends Error {
  constructor(public sessionStatus: string, public expected: string[]) {
    super(`invalid_session_state: ${sessionStatus}, expected one of ${expected.join(",")}`);
  }
}

const ACTIVE_STATUSES = ["draft", "lobby", "running", "paused"] as const;

// --- create / read --------------------------------------------------------

export async function createSession(
  trainerId: string,
  input: CreateSessionInput,
): Promise<Session> {
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
  // Уникальный код среди активных. Retry до 5 раз — коллизии маловероятны.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateAccessCode();
    try {
      const [created] = await db
        .insert(sessions)
        .values({
          trainerId,
          name: input.name,
          accessCode: code,
          pin: input.pin ?? null,
          scenarioPreset: input.scenarioPreset,
          configOverrides: input.configOverrides ?? {},
          maxTeams: input.maxTeams,
          status: "lobby", // сразу lobby — участники могут заходить
          expiresAt,
        })
        .returning();
      return created;
    } catch (e: any) {
      if (e?.code === "23505") continue; // unique violation, retry
      throw e;
    }
  }
  throw new Error("failed_to_generate_unique_code");
}

export async function listSessionsForTrainer(trainerId: string): Promise<Session[]> {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.trainerId, trainerId))
    .orderBy(desc(sessions.createdAt));
}

export async function getSession(id: string): Promise<Session | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return session ?? null;
}

export async function getSessionForTrainer(
  id: string,
  trainerId: string,
): Promise<Session | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.trainerId, trainerId)))
    .limit(1);
  return session ?? null;
}

export async function getSessionByCode(code: string): Promise<Session | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.accessCode, code.toUpperCase()),
        inArray(sessions.status, ["draft", "lobby", "running", "paused"]),
      ),
    )
    .limit(1);
  return session ?? null;
}

// --- lifecycle ------------------------------------------------------------

async function setStatus(
  sessionId: string,
  trainerId: string,
  newStatus: Session["status"],
  allowedFrom: Session["status"][],
  extras: Partial<typeof sessions.$inferInsert> = {},
): Promise<Session> {
  const session = await getSessionForTrainer(sessionId, trainerId);
  if (!session) throw new SessionNotFoundError();
  if (!allowedFrom.includes(session.status)) {
    throw new SessionInvalidStateError(session.status, allowedFrom);
  }
  const [updated] = await db
    .update(sessions)
    .set({ status: newStatus, updatedAt: new Date(), ...extras })
    .where(eq(sessions.id, sessionId))
    .returning();
  return updated;
}

export async function startSession(sessionId: string, trainerId: string): Promise<Session> {
  const session = await setStatus(sessionId, trainerId, "running", ["lobby", "draft"], {
    startedAt: new Date(),
  });
  // создаём первый раунд если нет
  const existingRounds = await db.select().from(rounds).where(eq(rounds.sessionId, sessionId));
  if (existingRounds.length === 0) {
    await db.insert(rounds).values({
      sessionId,
      roundNumber: 1,
      status: "running",
      startedAt: new Date(),
    });
  } else {
    // если последний раунд pending — стартуем его
    const last = existingRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];
    if (last.status === "pending") {
      await db
        .update(rounds)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(rounds.id, last.id));
    }
  }
  return session;
}

export async function pauseSession(sessionId: string, trainerId: string): Promise<Session> {
  const session = await setStatus(sessionId, trainerId, "paused", ["running"]);
  // pause текущий раунд
  await db
    .update(rounds)
    .set({ status: "paused" })
    .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "running")));
  return session;
}

export async function resumeSession(sessionId: string, trainerId: string): Promise<Session> {
  const session = await setStatus(sessionId, trainerId, "running", ["paused"]);
  await db
    .update(rounds)
    .set({ status: "running" })
    .where(and(eq(rounds.sessionId, sessionId), eq(rounds.status, "paused")));
  return session;
}

export async function endSession(sessionId: string, trainerId: string): Promise<Session> {
  const session = await setStatus(sessionId, trainerId, "ended", ["lobby", "running", "paused"], {
    endedAt: new Date(),
  });
  // end активные раунды
  await db
    .update(rounds)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        eq(rounds.sessionId, sessionId),
        or(eq(rounds.status, "running"), eq(rounds.status, "paused")),
      ),
    );
  return session;
}

export async function resetRound(sessionId: string, trainerId: string): Promise<Round> {
  const session = await getSessionForTrainer(sessionId, trainerId);
  if (!session) throw new SessionNotFoundError();
  if (!["paused", "ended", "running"].includes(session.status)) {
    throw new SessionInvalidStateError(session.status, ["paused", "ended", "running"]);
  }

  // Закрываем активный раунд (если есть)
  await db
    .update(rounds)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        eq(rounds.sessionId, sessionId),
        or(eq(rounds.status, "running"), eq(rounds.status, "paused")),
      ),
    );

  // Узнаём номер последнего раунда
  const allRounds = await db.select().from(rounds).where(eq(rounds.sessionId, sessionId));
  const nextNumber = allRounds.reduce((m, r) => Math.max(m, r.roundNumber), 0) + 1;

  // Создаём новый раунд (pending — стартанётся при session start)
  const [newRound] = await db
    .insert(rounds)
    .values({
      sessionId,
      roundNumber: nextNumber,
      status: "pending",
    })
    .returning();

  // Сбрасываем factory_state у всех команд (TODO: вынести инициализацию gameState в orchestrator)
  await db
    .update(teams)
    .set({ factoryState: {} })
    .where(eq(teams.sessionId, sessionId));

  // Обратно в lobby — тренер запустит когда готов
  await db
    .update(sessions)
    .set({ status: "lobby", updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  return newRound;
}

// --- teams (команды внутри сессии) ----------------------------------------

export class TeamNameTakenError extends Error {
  constructor() {
    super("team_name_taken");
  }
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

export async function joinSession(input: TeamJoinInput): Promise<TeamWithMembers> {
  const session = await getSessionByCode(input.code);
  if (!session) throw new SessionNotFoundError();

  // Проверяем PIN если задан
  if (session.pin && session.pin !== input.pin) {
    throw new SessionInvalidPinError();
  }

  // Проверяем что сессия принимает (lobby или draft)
  if (!["lobby", "draft"].includes(session.status)) {
    throw new SessionInvalidStateError(session.status, ["lobby", "draft"]);
  }

  // Проверяем не превышен ли лимит команд
  const existingTeams = await db.select().from(teams).where(eq(teams.sessionId, session.id));
  if (existingTeams.length >= session.maxTeams) {
    throw new SessionFullError();
  }

  // Проверка уникальности имени команды в рамках сессии
  if (existingTeams.some((t) => t.name.toLowerCase() === input.teamName.toLowerCase())) {
    throw new TeamNameTakenError();
  }

  const usedColors = existingTeams.map((t) => t.color);
  const color = pickTeamColor(usedColors);

  const [team] = await db
    .insert(teams)
    .values({
      sessionId: session.id,
      name: input.teamName,
      color,
      factoryState: {},
    })
    .returning();

  const memberRows = await db
    .insert(teamMembers)
    .values(
      input.members.map((m, i) => ({
        teamId: team.id,
        fullName: m.fullName,
        positionInTeam: i + 1,
      })),
    )
    .returning();

  return { ...team, members: memberRows };
}

export async function getTeamByDeviceToken(token: string): Promise<TeamWithMembers | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.deviceToken, token))
    .limit(1);
  if (!team) return null;
  const memberRows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id));
  return { ...team, members: memberRows };
}

export async function listTeamsForSession(sessionId: string): Promise<TeamWithMembers[]> {
  const teamRows = await db.select().from(teams).where(eq(teams.sessionId, sessionId));
  if (teamRows.length === 0) return [];
  const memberRows = await db
    .select()
    .from(teamMembers)
    .where(
      inArray(
        teamMembers.teamId,
        teamRows.map((t) => t.id),
      ),
    );
  return teamRows.map((t) => ({
    ...t,
    members: memberRows.filter((m) => m.teamId === t.id),
  }));
}

export async function updateTeamMembers(
  teamId: string,
  newMembers: { fullName: string }[],
): Promise<TeamMember[]> {
  await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  const inserted = await db
    .insert(teamMembers)
    .values(
      newMembers.map((m, i) => ({
        teamId,
        fullName: m.fullName,
        positionInTeam: i + 1,
      })),
    )
    .returning();
  return inserted;
}

export async function kickTeam(
  sessionId: string,
  teamId: string,
  trainerId: string,
): Promise<void> {
  const session = await getSessionForTrainer(sessionId, trainerId);
  if (!session) throw new SessionNotFoundError();
  await db.delete(teams).where(and(eq(teams.id, teamId), eq(teams.sessionId, sessionId)));
}

export async function touchTeam(teamId: string): Promise<void> {
  await db.update(teams).set({ lastSeenAt: new Date() }).where(eq(teams.id, teamId));
}
