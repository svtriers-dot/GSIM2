// =============================================================================
// GameOrchestrator — координирует in-memory state каждой активной сессии,
// синхронизирует с БД, пушит события в WS-каналы (trainer + teams).
// =============================================================================
//
// MVP-1: только базовые события (timer, team join/leave, broadcast).
// Реальная игровая логика (тики, очереди, расчёт throughput) подключится
// позже через интеграцию с client/src/lib/gameEngine.ts.
// =============================================================================

import { db } from "../db";
import {
  sessions,
  teams,
  teamMembers,
  teamRoundResults,
  rounds,
  decisions,
  type Session,
  type Team,
  type TeamMember,
  type Round,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { WebSocket } from "ws";

// --- типы ---

export interface OrchestratedTeam {
  id: string;
  name: string;
  color: string;
  factoryState: Record<string, unknown>;
  members: { id: string; fullName: string }[];
  // metric snapshot для тренера
  metrics: {
    cash: number;
    throughput: number;
    inventory: number;
    operatingExpense: number;
    bottleneckStationId?: string | null;
    bottleneckQueue?: number;
  };
  lastSeenAt: Date;
}

export interface SessionLiveState {
  sessionId: string;
  status: Session["status"];
  currentRound: Round | null;
  teams: OrchestratedTeam[];
  startedAt?: Date | null;
}

interface ActiveSession {
  session: Session;
  currentRound: Round | null;
  teams: Map<string, OrchestratedTeam>;
  // подписки на WS
  trainerSockets: Set<WebSocket>;
  teamSockets: Map<string /* teamId */, WebSocket>;
}

// --- in-memory store ---

const active: Map<string /* sessionId */, ActiveSession> = new Map();

// --- helpers ---

function defaultMetrics(): OrchestratedTeam["metrics"] {
  return {
    cash: 10000, // GAME_CONSTANTS.startingCash из gameConfig.ts
    throughput: 0,
    inventory: 0,
    operatingExpense: 0,
    bottleneckStationId: null,
    bottleneckQueue: 0,
  };
}

async function loadSession(sessionId: string): Promise<ActiveSession> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session) throw new Error("session_not_found");

  const allRounds = await db.select().from(rounds).where(eq(rounds.sessionId, sessionId));
  const currentRound =
    allRounds.find((r) => r.status === "running" || r.status === "paused") ??
    allRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0] ??
    null;

  const teamRows = await db.select().from(teams).where(eq(teams.sessionId, sessionId));
  // Один fetch всех members (без in() — фильтруем в JS)
  const allMembersFull: TeamMember[] = teamRows.length
    ? await db.select().from(teamMembers)
    : [];

  const teamsMap = new Map<string, OrchestratedTeam>();
  for (const t of teamRows) {
    teamsMap.set(t.id, {
      id: t.id,
      name: t.name,
      color: t.color,
      factoryState: (t.factoryState as Record<string, unknown>) ?? {},
      members: allMembersFull
        .filter((m) => m.teamId === t.id)
        .map((m) => ({ id: m.id, fullName: m.fullName })),
      metrics: defaultMetrics(),
      lastSeenAt: t.lastSeenAt,
    });
  }

  return {
    session,
    currentRound,
    teams: teamsMap,
    trainerSockets: new Set(),
    teamSockets: new Map(),
  };
}

async function ensureActive(sessionId: string): Promise<ActiveSession> {
  let a = active.get(sessionId);
  if (!a) {
    a = await loadSession(sessionId);
    active.set(sessionId, a);
  }
  return a;
}

// --- публичные методы для WS-каналов ---

export async function attachTrainerSocket(sessionId: string, ws: WebSocket): Promise<void> {
  const a = await ensureActive(sessionId);
  a.trainerSockets.add(ws);
  // сразу шлём текущий state
  ws.send(JSON.stringify({ type: "session.state_update", payload: snapshotState(a) }));
}

export function detachTrainerSocket(sessionId: string, ws: WebSocket): void {
  const a = active.get(sessionId);
  if (a) a.trainerSockets.delete(ws);
}

export async function attachTeamSocket(
  sessionId: string,
  teamId: string,
  ws: WebSocket,
): Promise<void> {
  const a = await ensureActive(sessionId);
  // если уже есть — закрываем старый (новый компьютер? обычно reconnect)
  const old = a.teamSockets.get(teamId);
  if (old && old !== ws && old.readyState === old.OPEN) {
    old.close(4000, "replaced");
  }
  a.teamSockets.set(teamId, ws);
  // шлём команде её state и таймер
  const team = a.teams.get(teamId);
  if (team) {
    ws.send(JSON.stringify({ type: "game.state_sync", payload: { team } }));
  }
  ws.send(
    JSON.stringify({
      type: "game.timer_event",
      payload: {
        status: a.session.status,
        currentRound: a.currentRound,
      },
    }),
  );
  // тренеру сообщаем
  broadcastToTrainers(a, { type: "team.connected", payload: { teamId } });
}

export function detachTeamSocket(sessionId: string, teamId: string, ws: WebSocket): void {
  const a = active.get(sessionId);
  if (!a) return;
  if (a.teamSockets.get(teamId) === ws) {
    a.teamSockets.delete(teamId);
    broadcastToTrainers(a, { type: "team.disconnected", payload: { teamId } });
  }
}

// --- события: команда добавилась через REST /api/teams/join ---

export async function notifyTeamJoined(sessionId: string, teamId: string): Promise<void> {
  // Перечитываем команду из БД и добавляем в active
  const [t] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!t) return;
  const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  const a = await ensureActive(sessionId);
  a.teams.set(teamId, {
    id: t.id,
    name: t.name,
    color: t.color,
    factoryState: (t.factoryState as Record<string, unknown>) ?? {},
    members: members.map((m) => ({ id: m.id, fullName: m.fullName })),
    metrics: defaultMetrics(),
    lastSeenAt: t.lastSeenAt,
  });
  broadcastToTrainers(a, {
    type: "team.joined",
    payload: { team: a.teams.get(teamId) },
  });
}

// --- события: тренер управляет таймером (через REST POST /sessions/:id/start и т.д.) ---

export async function notifySessionStateChange(sessionId: string): Promise<void> {
  // Перечитываем сессию из БД и пушим всем
  const a = await ensureActive(sessionId);
  const [updated] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (updated) a.session = updated;
  const allRounds = await db.select().from(rounds).where(eq(rounds.sessionId, sessionId));
  a.currentRound =
    allRounds.find((r) => r.status === "running" || r.status === "paused") ??
    allRounds.sort((a2, b) => b.roundNumber - a2.roundNumber)[0] ??
    null;

  const timerEvent = {
    type: "game.timer_event",
    payload: { status: a.session.status, currentRound: a.currentRound },
  };
  // всем командам
  for (const ws of Array.from(a.teamSockets.values())) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(timerEvent));
  }
  // тренерам — полный state
  broadcastToTrainers(a, { type: "session.state_update", payload: snapshotState(a) });
}

// --- broadcast / annotation ---

export function broadcastMessage(sessionId: string, message: string): void {
  const a = active.get(sessionId);
  if (!a) return;
  const event = { type: "broadcast.received", payload: { message, timestamp: Date.now() } };
  for (const ws of Array.from(a.teamSockets.values())) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
  }
}

// V2 forced events: пушит событие всем командам сессии + тренеру (для UI)
export function broadcastForcedEvent(
  sessionId: string,
  event: { type: string; payload: Record<string, unknown>; durationMs: number | null; triggeredAt: number },
): void {
  const a = active.get(sessionId);
  if (!a) return;
  const wsEvent = { type: "forced_event", payload: event };
  const data = JSON.stringify(wsEvent);
  for (const ws of Array.from(a.teamSockets.values())) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
  for (const ws of Array.from(a.trainerSockets)) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

export function annotateStation(
  sessionId: string,
  stationId: string,
  text: string,
  durationMs: number,
): void {
  const a = active.get(sessionId);
  if (!a) return;
  const event = {
    type: "annotation.received",
    payload: { stationId, text, durationMs, timestamp: Date.now() },
  };
  for (const ws of Array.from(a.teamSockets.values())) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
  }
}

// --- game action от команды ---

export async function applyTeamAction(
  sessionId: string,
  teamId: string,
  actionType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const a = await ensureActive(sessionId);
  const team = a.teams.get(teamId);
  if (!team) return;
  if (!a.currentRound || a.currentRound.status !== "running") return;

  // Append-only журнал решений (для replay в MVP-2.B)
  await db.insert(decisions).values({
    teamId,
    roundId: a.currentRound.id,
    actionType,
    payload,
  });

  // Помечаем lastAction в factoryState (для тренера видно сразу)
  team.factoryState = { ...team.factoryState, lastAction: { actionType, payload, ts: Date.now() } };
}

// MVP-2.A1: команда раз в 2с шлёт реальные метрики
export async function applyTeamMetrics(
  sessionId: string,
  teamId: string,
  metrics: Partial<OrchestratedTeam["metrics"]> & { day?: number; timeInDay?: number; running?: boolean; gameOver?: boolean },
): Promise<void> {
  const a = await ensureActive(sessionId);
  const team = a.teams.get(teamId);
  if (!team) return;

  // Сохраняем предыдущие значения для детектирования изменений
  const prevCash = team.metrics.cash;
  const prevBottleneck = team.metrics.bottleneckStationId ?? null;

  // Применяем новые метрики
  team.metrics = {
    cash: typeof metrics.cash === "number" ? metrics.cash : team.metrics.cash,
    throughput: typeof metrics.throughput === "number" ? metrics.throughput : team.metrics.throughput,
    inventory: typeof metrics.inventory === "number" ? metrics.inventory : team.metrics.inventory,
    operatingExpense:
      typeof metrics.operatingExpense === "number" ? metrics.operatingExpense : team.metrics.operatingExpense,
    bottleneckStationId:
      "bottleneckStationId" in metrics ? (metrics.bottleneckStationId ?? null) : team.metrics.bottleneckStationId,
    bottleneckQueue:
      typeof metrics.bottleneckQueue === "number" ? metrics.bottleneckQueue : team.metrics.bottleneckQueue,
  };
  team.lastSeenAt = new Date();

  broadcastToTrainers(a, {
    type: "team.metric_update",
    payload: { teamId, metrics: team.metrics },
  });

  // MVP-2.B6: алерты для тренера
  // 1. Cash перешёл в минус
  if (prevCash >= 0 && team.metrics.cash < 0) {
    broadcastToTrainers(a, {
      type: "alert",
      payload: {
        kind: "cash_negative",
        teamId,
        teamName: team.name,
        cash: team.metrics.cash,
        timestamp: Date.now(),
      },
    });
  }
  // 2. Bottleneck сменился
  const newBottleneck = team.metrics.bottleneckStationId ?? null;
  if (prevBottleneck !== newBottleneck && newBottleneck) {
    broadcastToTrainers(a, {
      type: "alert",
      payload: {
        kind: "bottleneck_changed",
        teamId,
        teamName: team.name,
        from: prevBottleneck,
        to: newBottleneck,
        timestamp: Date.now(),
      },
    });
  }
}

// MVP-2.A1: команда сообщает что игровое время закончилось — фиксируем snapshot factoryState
export async function applyTeamGameOver(
  sessionId: string,
  teamId: string,
  snapshot: Record<string, unknown>,
  metrics: Partial<OrchestratedTeam["metrics"]>,
): Promise<void> {
  const a = await ensureActive(sessionId);
  const team = a.teams.get(teamId);
  if (!team) return;

  // Сохраняем полный snapshot + явные флаги завершения (для сертификатов)
  const completed = (snapshot as any)?.gameOver === true;
  const finalProfitLoss = (snapshot as any)?.dayEndSummary?.profitLoss;
  team.factoryState = {
    ...team.factoryState,
    snapshot,
    completedAllDays: completed,
    ...(typeof finalProfitLoss === "number" ? { profitLoss: finalProfitLoss } : {}),
  };
  // Персистим в БД, чтобы завершённость пережила рестарт сервера
  try {
    await db.update(teams).set({ factoryState: team.factoryState as any }).where(eq(teams.id, teamId));
  } catch (e) {
    console.error("persist factoryState on game_over:", e);
  }
  if (typeof metrics.cash === "number") team.metrics.cash = metrics.cash;
  if (typeof metrics.throughput === "number") team.metrics.throughput = metrics.throughput;
  if (typeof metrics.inventory === "number") team.metrics.inventory = metrics.inventory;
  if (typeof metrics.operatingExpense === "number") team.metrics.operatingExpense = metrics.operatingExpense;

  broadcastToTrainers(a, {
    type: "team.metric_update",
    payload: { teamId, metrics: team.metrics },
  });
  broadcastToTrainers(a, {
    type: "team.game_over",
    payload: { teamId },
  });

  // Авто-финал: если ВСЕ команды прошли все дни — завершаем сессию и выдаём сертификаты
  await maybeAutoFinalizeSession(sessionId, a);
}

// Гард против повторного авто-финала одной сессии
const autoFinalized = new Set<string>();

// Авто-завершение сессии, когда все команды доиграли все дни (gameOver).
// Затем финализация результатов + генерация сертификатов + пуш статуса командам.
async function maybeAutoFinalizeSession(sessionId: string, a: ActiveSession): Promise<void> {
  if (autoFinalized.has(sessionId)) return;
  if (a.session.status !== "running" && a.session.status !== "paused") return;
  const teamsArr = Array.from(a.teams.values());
  if (teamsArr.length === 0) return;
  const allDone = teamsArr.every((t) => (t.factoryState as any)?.completedAllDays === true);
  if (!allDone) return;

  autoFinalized.add(sessionId);
  try {
    // Динамический импорт — исключает циклы на загрузке модуля
    const { endSession } = await import("./sessions");
    const { generateCertificatesForSession } = await import("./certificates");
    await endSession(sessionId, a.session.trainerId);
    const allRounds = await db.select().from(rounds).where(eq(rounds.sessionId, sessionId));
    const lastRound = allRounds.sort((x, y) => y.roundNumber - x.roundNumber)[0];
    if (lastRound) await finalizeRoundResults(sessionId, lastRound.id);
    await generateCertificatesForSession(sessionId);
    await notifySessionStateChange(sessionId);
    console.log(`[orchestrator] auto-finalized session ${sessionId}: все команды завершили игру`);
  } catch (e) {
    autoFinalized.delete(sessionId); // дать шанс повторить (в т.ч. ручному завершению тренера)
    console.error("maybeAutoFinalizeSession:", e);
  }
}

// MVP-2.A5: при end сессии — фиксируем результаты раунда в team_round_results
export async function finalizeRoundResults(sessionId: string, roundId: string): Promise<void> {
  const a = await ensureActive(sessionId);
  const teamsArr = Array.from(a.teams.values());
  // Сортировка по cash desc
  const sorted = [...teamsArr].sort((x, y) => y.metrics.cash - x.metrics.cash);
  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    try {
      // upsert: если строка есть — обновляем, иначе вставляем
      const existing = await db
        .select()
        .from(teamRoundResults)
        .where(and(eq(teamRoundResults.teamId, team.id), eq(teamRoundResults.roundId, roundId)))
        .limit(1);
      const row = {
        teamId: team.id,
        roundId,
        finalCash: team.metrics.cash,
        throughput: team.metrics.throughput,
        inventory: team.metrics.inventory,
        operatingExpense: team.metrics.operatingExpense,
        bottleneckStationId: team.metrics.bottleneckStationId ?? null,
        rankInRound: i + 1,
        stateSnapshot: team.factoryState,
      };
      if (existing.length > 0) {
        await db
          .update(teamRoundResults)
          .set(row)
          .where(and(eq(teamRoundResults.teamId, team.id), eq(teamRoundResults.roundId, roundId)));
      } else {
        await db.insert(teamRoundResults).values(row);
      }
    } catch (e) {
      console.error(`finalizeRoundResults team=${team.id}:`, e);
    }
  }
}

// --- helpers ---

function snapshotState(a: ActiveSession): SessionLiveState {
  return {
    sessionId: a.session.id,
    status: a.session.status,
    currentRound: a.currentRound,
    startedAt: a.session.startedAt,
    teams: Array.from(a.teams.values()),
  };
}

function broadcastToTrainers(a: ActiveSession, event: { type: string; payload: unknown }): void {
  const data = JSON.stringify(event);
  for (const ws of Array.from(a.trainerSockets)) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

// --- периодический sync state в БД (MVP-2 сделает это умнее) ---

const SYNC_INTERVAL_MS = 5000;

setInterval(async () => {
  for (const [sessionId, a] of Array.from(active.entries())) {
    // Пишем factoryState каждой команды в БД (раз в 5 сек)
    for (const team of Array.from(a.teams.values())) {
      try {
        await db
          .update(teams)
          .set({ factoryState: team.factoryState, lastSeenAt: new Date() })
          .where(eq(teams.id, team.id));
      } catch (e) {
        console.error(`sync error for team ${team.id}:`, e);
      }
    }
    // Если сессия ended — выгружаем из памяти
    if (a.session.status === "ended" || a.session.status === "archived") {
      // даём время на финальный broadcast и выгружаем через 30 сек
      setTimeout(() => active.delete(sessionId), 30000);
    }
  }
}, SYNC_INTERVAL_MS);
