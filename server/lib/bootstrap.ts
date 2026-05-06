// MVP-2 Admin: bootstrap super_admin при startup
// + бэкфилл существующих pending тренеров (которые регились ДО введения ролей) → active

import { db } from "../db";
import { trainers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function runStartupBootstrap(): Promise<void> {
  // 0. Fix: drizzle-kit в интерактивном режиме на VM ошибочно переименовал
  //    bootstrap_flags → admin_audit_log в одном из деплоев. Если admin_audit_log
  //    содержит колонку 'flag' (схема bootstrap_flags) — это сломанная версия.
  //    DROP её, чтобы drizzle-kit создал заново со своей правильной схемой.
  try {
    const broken = await db.execute(sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'admin_audit_log' AND column_name = 'flag'
      LIMIT 1
    `);
    if ((broken as any).rows?.length > 0 || (broken as any).rowCount > 0) {
      await db.execute(sql`DROP TABLE IF EXISTS admin_audit_log`);
      console.warn("[bootstrap] dropped broken admin_audit_log (was renamed from bootstrap_flags)");
    }
  } catch (e) {
    console.error("[bootstrap] check broken admin_audit_log failed:", e);
  }

  // 1. Legacy auto-approve. ОДНОРАЗОВО, через таблицу-флаг — не по таймауту.
  //    Это предотвращает кейс: новый юзер регистрируется, через минуту рестарт сервера,
  //    он бы автоматически получил active без апрува. Теперь — только при первом запуске
  //    после миграции, когда BOOTSTRAP_LEGACY_APPLIED ещё не записан.
  try {
    // Создаём служебную таблицу для one-shot флагов (если ещё нет)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bootstrap_flags (
        flag TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const flagCheck = await db.execute(sql`
      SELECT 1 FROM bootstrap_flags WHERE flag = 'legacy_auto_approve_v1'
    `);
    const alreadyApplied = (flagCheck as any).rows?.length > 0 || (flagCheck as any).rowCount > 0;

    if (!alreadyApplied) {
      const result = await db.execute(sql`
        UPDATE trainers
        SET role = 'active'::trainer_role,
            approved_at = NOW(),
            notes = COALESCE(notes, '') || E'\n[bootstrap] auto-approved (legacy migration)'
        WHERE role = 'pending'
          AND created_at < NOW() - INTERVAL '5 minutes'
      `);
      const affected = (result as any).rowCount ?? 0;
      if (affected > 0) {
        console.log(`[bootstrap] auto-approved ${affected} legacy trainer(s) → active`);
      }
      await db.execute(sql`
        INSERT INTO bootstrap_flags (flag) VALUES ('legacy_auto_approve_v1')
        ON CONFLICT (flag) DO NOTHING
      `);
      console.log("[bootstrap] legacy_auto_approve_v1 marked as applied");
    }
  } catch (e) {
    console.error("[bootstrap] legacy backfill failed:", e);
  }

  // 2. Super admin из ENV
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail) {
    console.log("[bootstrap] SUPER_ADMIN_EMAIL не задан — пропускаю");
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(trainers)
      .where(eq(trainers.email, adminEmail))
      .limit(1);

    if (!existing) {
      console.log(
        `[bootstrap] SUPER_ADMIN_EMAIL=${adminEmail} — тренер не найден. Зарегистрируйся на /trainer/login и затем запусти повторный startup или CLI grant-super-admin.`,
      );
      return;
    }

    if (existing.role === "super_admin") {
      console.log(`[bootstrap] super_admin ${adminEmail} уже настроен`);
      return;
    }

    await db
      .update(trainers)
      .set({
        role: "super_admin",
        approvedAt: existing.approvedAt ?? new Date(),
        approvedBy: existing.id, // self-approve для super_admin
        updatedAt: new Date(),
        notes: (existing.notes ?? "") + "\n[bootstrap] upgraded to super_admin via SUPER_ADMIN_EMAIL",
      })
      .where(eq(trainers.id, existing.id));
    console.log(`[bootstrap] ✅ ${adminEmail} → super_admin`);
  } catch (e) {
    console.error("[bootstrap] super_admin upgrade failed:", e);
  }
}
