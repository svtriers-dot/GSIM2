import { Router } from "express";
import { db } from "../db";
import {
  trainers,
  sessions,
  teams,
  adminTrainerActionSchema,
  adminListTrainersQuerySchema,
} from "@shared/schema";
import { and, desc, eq, ilike, or, sql, inArray } from "drizzle-orm";
import { requireSuperAdmin } from "../middleware/auth";
import { resetPasswordRateLimit } from "../middleware/rateLimit";
import { hashPassword } from "../lib/passwords";
import { z } from "zod";
import { recordAdminAction, listAuditLog } from "../services/auditLog";
import { auditLogQuerySchema } from "@shared/schema";

export const adminRouter = Router();

// --- DASHBOARD: счётчики ---

adminRouter.get("/dashboard", requireSuperAdmin, async (_req, res) => {
  const counts = await db
    .select({
      role: trainers.role,
      count: sql<number>`count(*)::int`,
    })
    .from(trainers)
    .groupBy(trainers.role);

  const out = {
    pending: 0,
    active: 0,
    suspended: 0,
    rejected: 0,
    super_admin: 0,
  };
  for (const row of counts) {
    out[row.role as keyof typeof out] = Number(row.count);
  }

  // Сколько сессий в проде/lobby/архиве — короткий obviously stat
  const sessionCounts = await db
    .select({
      status: sessions.status,
      count: sql<number>`count(*)::int`,
    })
    .from(sessions)
    .groupBy(sessions.status);
  const sessionStats = Object.fromEntries(
    sessionCounts.map((r) => [r.status, Number(r.count)]),
  );

  // Сколько уникальных команд во всей системе
  const [teamsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teams);

  res.json({
    trainers: out,
    sessions: sessionStats,
    totalTeams: Number(teamsRow.count),
  });
});

// --- TRAINERS list ---

adminRouter.get("/trainers", requireSuperAdmin, async (req, res) => {
  const parsed = adminListTrainersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation" });
  }
  const { role, search } = parsed.data;
  // Pagination — отдельные поля чтобы не ломать фильтры сверху
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? "100"))));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0")));

  const filters: any[] = [];
  if (role) filters.push(eq(trainers.role, role));
  if (search) {
    filters.push(
      or(
        ilike(trainers.email, `%${search}%`),
        ilike(trainers.name, `%${search}%`),
        ilike(trainers.organization, `%${search}%`),
      )!,
    );
  }
  const where = filters.length ? and(...filters) : undefined;

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(trainers)
    .where(where);

  const rows = await db
    .select({
      id: trainers.id,
      email: trainers.email,
      name: trainers.name,
      organization: trainers.organization,
      role: trainers.role,
      approvedAt: trainers.approvedAt,
      approvedBy: trainers.approvedBy,
      notes: trainers.notes,
      createdAt: trainers.createdAt,
      updatedAt: trainers.updatedAt,
    })
    .from(trainers)
    .where(where)
    .orderBy(desc(trainers.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ trainers: rows, total: Number(total), limit, offset });
});

// --- TRAINER detail ---

adminRouter.get("/trainers/:id", requireSuperAdmin, async (req, res) => {
  const trainerId = req.params.id as string;
  const [trainer] = await db
    .select({
      id: trainers.id,
      email: trainers.email,
      name: trainers.name,
      organization: trainers.organization,
      role: trainers.role,
      approvedAt: trainers.approvedAt,
      approvedBy: trainers.approvedBy,
      notes: trainers.notes,
      createdAt: trainers.createdAt,
      updatedAt: trainers.updatedAt,
    })
    .from(trainers)
    .where(eq(trainers.id, trainerId))
    .limit(1);
  if (!trainer) return res.status(404).json({ error: "not_found" });

  // Сессии этого тренера
  const trainerSessions = await db
    .select({
      id: sessions.id,
      name: sessions.name,
      accessCode: sessions.accessCode,
      status: sessions.status,
      scenarioPreset: sessions.scenarioPreset,
      maxTeams: sessions.maxTeams,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.trainerId, trainerId))
    .orderBy(desc(sessions.createdAt));

  // Кто апрувил (если есть)
  let approver = null;
  if (trainer.approvedBy) {
    const [a] = await db
      .select({ id: trainers.id, email: trainers.email, name: trainers.name })
      .from(trainers)
      .where(eq(trainers.id, trainer.approvedBy))
      .limit(1);
    if (a) approver = a;
  }

  res.json({ trainer, sessions: trainerSessions, approver });
});

// --- LIFECYCLE: approve / reject / suspend / reactivate ---

async function setTrainerRole(
  targetId: string,
  newRole: "active" | "suspended" | "rejected",
  superAdminId: string,
  notes?: string,
): Promise<void> {
  const updateData: Partial<typeof trainers.$inferInsert> = {
    role: newRole,
    updatedAt: new Date(),
    notes: notes ?? null,
  };
  if (newRole === "active") {
    updateData.approvedAt = new Date();
    updateData.approvedBy = superAdminId;
  }
  await db.update(trainers).set(updateData).where(eq(trainers.id, targetId));
}

adminRouter.post("/trainers/:id/approve", requireSuperAdmin, async (req, res) => {
  const targetId = req.params.id as string;
  const parsed = adminTrainerActionSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "validation" });

  const [target] = await db.select().from(trainers).where(eq(trainers.id, targetId)).limit(1);
  if (!target) return res.status(404).json({ error: "not_found" });
  if (target.role === "active" || target.role === "super_admin") {
    return res.status(409).json({ error: "already_active" });
  }
  if (target.role === "rejected") {
    return res.status(409).json({ error: "rejected_cannot_approve" });
  }

  await setTrainerRole(targetId, "active", req.trainer!.sub, parsed.data.notes);
  await recordAdminAction({
    req,
    actor: req.trainer!,
    action: "trainer_approved",
    targetType: "trainer",
    targetId,
    targetLabel: target.email,
    payload: { notes: parsed.data.notes ?? null, prevRole: target.role },
  });
  res.json({ ok: true });
});

adminRouter.post("/trainers/:id/reject", requireSuperAdmin, async (req, res) => {
  const targetId = req.params.id as string;
  const parsed = adminTrainerActionSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "validation" });

  const [target] = await db.select().from(trainers).where(eq(trainers.id, targetId)).limit(1);
  if (!target) return res.status(404).json({ error: "not_found" });
  if (target.role === "super_admin") {
    return res.status(409).json({ error: "cannot_reject_super_admin" });
  }

  await setTrainerRole(targetId, "rejected", req.trainer!.sub, parsed.data.notes);
  await recordAdminAction({
    req,
    actor: req.trainer!,
    action: "trainer_rejected",
    targetType: "trainer",
    targetId,
    targetLabel: target.email,
    payload: { notes: parsed.data.notes ?? null, prevRole: target.role },
  });
  res.json({ ok: true });
});

adminRouter.post("/trainers/:id/suspend", requireSuperAdmin, async (req, res) => {
  const targetId = req.params.id as string;
  const parsed = adminTrainerActionSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "validation" });

  const [target] = await db.select().from(trainers).where(eq(trainers.id, targetId)).limit(1);
  if (!target) return res.status(404).json({ error: "not_found" });
  if (target.role === "super_admin") {
    return res.status(409).json({ error: "cannot_suspend_super_admin" });
  }
  if (target.role !== "active") {
    return res.status(409).json({ error: "not_active" });
  }

  await setTrainerRole(targetId, "suspended", req.trainer!.sub, parsed.data.notes);
  await recordAdminAction({
    req,
    actor: req.trainer!,
    action: "trainer_suspended",
    targetType: "trainer",
    targetId,
    targetLabel: target.email,
    payload: { notes: parsed.data.notes ?? null, prevRole: target.role },
  });
  res.json({ ok: true });
});

adminRouter.post("/trainers/:id/reactivate", requireSuperAdmin, async (req, res) => {
  const targetId = req.params.id as string;
  const parsed = adminTrainerActionSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "validation" });

  const [target] = await db.select().from(trainers).where(eq(trainers.id, targetId)).limit(1);
  if (!target) return res.status(404).json({ error: "not_found" });
  if (target.role !== "suspended") {
    return res.status(409).json({ error: "not_suspended" });
  }

  await setTrainerRole(targetId, "active", req.trainer!.sub, parsed.data.notes);
  await recordAdminAction({
    req,
    actor: req.trainer!,
    action: "trainer_reactivated",
    targetType: "trainer",
    targetId,
    targetLabel: target.email,
    payload: { notes: parsed.data.notes ?? null, prevRole: target.role },
  });
  res.json({ ok: true });
});

// --- ALL SESSIONS in system ---

adminRouter.get("/sessions", requireSuperAdmin, async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? "100"))));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0")));

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(sessions);

  const rows = await db
    .select({
      id: sessions.id,
      name: sessions.name,
      accessCode: sessions.accessCode,
      status: sessions.status,
      scenarioPreset: sessions.scenarioPreset,
      maxTeams: sessions.maxTeams,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      createdAt: sessions.createdAt,
      trainerId: sessions.trainerId,
      trainerEmail: trainers.email,
      trainerName: trainers.name,
      trainerOrganization: trainers.organization,
    })
    .from(sessions)
    .leftJoin(trainers, eq(sessions.trainerId, trainers.id))
    .orderBy(desc(sessions.createdAt))
    .limit(limit)
    .offset(offset);

  // Подсчёт команд по сессии (для UI)
  const sessionIds = rows.map((r) => r.id);
  let teamCounts: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const teamRows = await db
      .select({
        sessionId: teams.sessionId,
        count: sql<number>`count(*)::int`,
      })
      .from(teams)
      .where(inArray(teams.sessionId, sessionIds))
      .groupBy(teams.sessionId);
    teamCounts = Object.fromEntries(teamRows.map((r) => [r.sessionId, Number(r.count)]));
  }

  res.json({
    sessions: rows.map((r) => ({ ...r, teamCount: teamCounts[r.id] || 0 })),
    total: Number(total),
    limit,
    offset,
  });
});

// MVP-2.C4 — суперадмин сбрасывает пароль тренеру (без email)
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

adminRouter.post("/trainers/:id/reset-password", resetPasswordRateLimit, requireSuperAdmin, async (req, res) => {
  const targetId = req.params.id as string;
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation" });

  const [target] = await db.select().from(trainers).where(eq(trainers.id, targetId)).limit(1);
  if (!target) return res.status(404).json({ error: "not_found" });

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(trainers)
    .set({
      passwordHash,
      updatedAt: new Date(),
      notes: (target.notes ?? "") + `\n[admin] password reset by super_admin at ${new Date().toISOString()}`,
    })
    .where(eq(trainers.id, targetId));

  await recordAdminAction({
    req,
    actor: req.trainer!,
    action: "trainer_password_reset",
    targetType: "trainer",
    targetId,
    targetLabel: target.email,
    payload: null, // namepюо пароль не логируем
  });
  res.json({ ok: true });
});

// MVP-2 Audit log — просмотр для super_admin
adminRouter.get("/audit-log", requireSuperAdmin, async (req, res) => {
  const parsed = auditLogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation" });
  }
  const result = await listAuditLog(parsed.data);
  res.json(result);
});

// История действий по конкретному тренеру (используется на странице /admin/trainers/:id)
adminRouter.get("/trainers/:id/audit", requireSuperAdmin, async (req, res) => {
  const targetId = req.params.id as string;
  const result = await listAuditLog({ targetId, limit: 100 });
  res.json(result);
});

