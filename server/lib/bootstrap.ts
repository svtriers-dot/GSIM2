// MVP-2 Admin: bootstrap super_admin при startup
// + бэкфилл существующих pending тренеров (которые регились ДО введения ролей) → active

import { db } from "../db";
import { trainers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function runStartupBootstrap(): Promise<void> {
  // 1. Бэкфилл legacy: все тренеры старее 1 минуты от текущего момента,
  //    которые получили role=pending по дефолту после миграции — переводим в active.
  //    Это однократно сработает после первого деплоя с миграцией.
  try {
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
  } catch (e) {
    console.error("[bootstrap] backfill legacy failed:", e);
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
