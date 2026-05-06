// CLI: npm run grant-super-admin -- <email>
// Гранит роль super_admin тренеру с указанным email.
// Если тренера нет — выводит ошибку.

import { db } from "../server/db";
import { trainers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Использование: npm run grant-super-admin -- <email>");
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(trainers)
    .where(eq(trainers.email, email))
    .limit(1);

  if (!existing) {
    console.error(`Тренер с email=${email} не найден. Зарегистрируйте через /trainer/login.`);
    process.exit(1);
  }

  if (existing.role === "super_admin") {
    console.log(`Тренер ${email} уже super_admin.`);
    process.exit(0);
  }

  await db
    .update(trainers)
    .set({
      role: "super_admin",
      approvedAt: existing.approvedAt ?? new Date(),
      approvedBy: existing.id,
      updatedAt: new Date(),
      notes: (existing.notes ?? "") + "\n[CLI] upgraded to super_admin",
    })
    .where(eq(trainers.id, existing.id));

  console.log(`✅ ${email} (id=${existing.id}) → super_admin`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
