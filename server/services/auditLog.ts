// MVP-2 Audit log: helper для записи действий super_admin.
// Используется во всех /api/admin/* endpoints после успешного действия.

import type { Request } from "express";
import { db } from "../db";
import { adminAuditLog, trainers } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import type { TrainerJwtPayload } from "../lib/jwt";

export type AdminActionType =
  | "trainer_approved"
  | "trainer_rejected"
  | "trainer_suspended"
  | "trainer_reactivated"
  | "trainer_password_reset"
  | "super_admin_login"
  | "super_admin_logout";

interface RecordParams {
  req: Request;
  actor: TrainerJwtPayload;
  action: AdminActionType;
  targetType?: "trainer" | "session" | null;
  targetId?: string | null;
  targetLabel?: string | null;
  payload?: Record<string, unknown> | null;
}

function getClientIp(req: Request): string | null {
  // X-Forwarded-For может содержать список IP через запятую — берём первый
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

// Записывает действие в audit log. Никогда не бросает наружу — ошибка лога
// не должна ломать действие.
export async function recordAdminAction(params: RecordParams): Promise<void> {
  try {
    // Получаем актуальное имя актора (если он ещё в БД)
    let actorName: string | null = null;
    try {
      const [trainer] = await db
        .select({ name: trainers.name })
        .from(trainers)
        .where(eq(trainers.id, params.actor.sub))
        .limit(1);
      actorName = trainer?.name ?? null;
    } catch {}

    await db.insert(adminAuditLog).values({
      actorId: params.actor.sub,
      actorEmail: params.actor.email,
      actorName,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      targetLabel: params.targetLabel ?? null,
      payload: params.payload ?? null,
      ipAddress: getClientIp(params.req),
      userAgent: typeof params.req.headers["user-agent"] === "string" ? params.req.headers["user-agent"] : null,
    });
  } catch (e) {
    console.error("[audit] recordAdminAction failed:", e);
  }
}

// Чтение audit log с фильтрами
export interface AuditLogFilter {
  action?: AdminActionType;
  actorId?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLog(filter: AuditLogFilter) {
  const conditions: any[] = [];
  if (filter.action) conditions.push(eq(adminAuditLog.action, filter.action));
  if (filter.actorId) conditions.push(eq(adminAuditLog.actorId, filter.actorId));
  if (filter.targetId) conditions.push(eq(adminAuditLog.targetId, filter.targetId));
  if (filter.dateFrom) conditions.push(gte(adminAuditLog.timestamp, new Date(filter.dateFrom)));
  if (filter.dateTo) conditions.push(lte(adminAuditLog.timestamp, new Date(filter.dateTo)));

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(adminAuditLog)
    .where(where);

  const rows = await db
    .select()
    .from(adminAuditLog)
    .where(where)
    .orderBy(desc(adminAuditLog.timestamp))
    .limit(filter.limit ?? 100)
    .offset(filter.offset ?? 0);

  return { rows, total: Number(total) };
}
