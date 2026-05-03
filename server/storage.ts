import { type User, type InsertUser, type GameResult, type InsertGameResult, users, gameResults } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveGameResult(result: InsertGameResult): Promise<GameResult>;
  getTopGameResults(limit?: number): Promise<GameResult[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async saveGameResult(result: InsertGameResult): Promise<GameResult> {
    const [gameResult] = await db.insert(gameResults).values(result).returning();
    return gameResult;
  }

  async getTopGameResults(limit = 20): Promise<GameResult[]> {
    return db.select().from(gameResults).orderBy(desc(gameResults.finalCash)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
