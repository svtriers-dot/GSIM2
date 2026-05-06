import { db } from "../db";
import { trainers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { signTrainerToken } from "../lib/jwt";
import type {
  Trainer,
  TrainerRegisterInput,
  TrainerLoginInput,
} from "@shared/schema";

export class TrainerExistsError extends Error {
  constructor() {
    super("trainer_exists");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid_credentials");
  }
}

export interface AuthResult {
  trainer: Omit<Trainer, "passwordHash">;
  token: string;
}

export async function registerTrainer(input: TrainerRegisterInput): Promise<AuthResult> {
  const existing = await db
    .select()
    .from(trainers)
    .where(eq(trainers.email, input.email))
    .limit(1);
  if (existing.length > 0) throw new TrainerExistsError();

  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(trainers)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      organization: input.organization ?? null,
    })
    .returning();

  const token = signTrainerToken({ id: created.id, email: created.email });

  const { passwordHash: _, ...safe } = created;
  return { trainer: safe, token };
}

export async function loginTrainer(input: TrainerLoginInput): Promise<AuthResult> {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(eq(trainers.email, input.email))
    .limit(1);
  if (!trainer) throw new InvalidCredentialsError();

  const ok = await verifyPassword(input.password, trainer.passwordHash);
  if (!ok) throw new InvalidCredentialsError();

  const token = signTrainerToken({ id: trainer.id, email: trainer.email });

  const { passwordHash: _, ...safe } = trainer;
  return { trainer: safe, token };
}

export async function getTrainerById(id: string): Promise<Omit<Trainer, "passwordHash"> | null> {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(eq(trainers.id, id))
    .limit(1);
  if (!trainer) return null;
  const { passwordHash: _, ...safe } = trainer;
  return safe;
}
