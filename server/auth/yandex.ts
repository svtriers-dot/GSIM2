// Yandex OAuth для тренеров.
// Документация: https://yandex.ru/dev/id/doc/dg/oauth/concepts/about.html
// Flow:
//  1. GET  /api/trainer/auth/yandex/start   → 302 redirect на Yandex
//  2. GET  /api/trainer/auth/yandex/callback?code=...
//        → обмен code на access_token
//        → GET https://login.yandex.ru/info?format=json (profile)
//        → find-or-create trainer (role=pending для новых)
//        → 302 redirect на /trainer (с токеном в query или session)

import { db } from "../db";
import { trainers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { signTrainerToken, type TrainerRole } from "../lib/jwt";
import { hashPassword } from "../lib/passwords";

const YA_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
const YA_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;
const YA_REDIRECT_URI =
  process.env.YANDEX_REDIRECT_URI ||
  (process.env.NODE_ENV === "production"
    ? "https://toc.tesstech.ru/api/trainer/auth/yandex/callback"
    : "http://localhost:5000/api/trainer/auth/yandex/callback");

export function isYandexConfigured(): boolean {
  return !!(YA_CLIENT_ID && YA_CLIENT_SECRET);
}

export function buildYandexAuthUrl(state: string): string {
  if (!YA_CLIENT_ID) throw new Error("yandex_not_configured");
  const url = new URL("https://oauth.yandex.ru/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", YA_CLIENT_ID);
  url.searchParams.set("redirect_uri", YA_REDIRECT_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

interface YandexTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

interface YandexProfile {
  id: string;
  login: string;
  default_email?: string;
  emails?: string[];
  real_name?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
}

export async function exchangeCodeForToken(code: string): Promise<YandexTokenResponse> {
  if (!YA_CLIENT_ID || !YA_CLIENT_SECRET) throw new Error("yandex_not_configured");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: YA_CLIENT_ID,
    client_secret: YA_CLIENT_SECRET,
  });
  const res = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`yandex_token_exchange_failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<YandexTokenResponse>;
}

export async function fetchYandexProfile(accessToken: string): Promise<YandexProfile> {
  const res = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`yandex_profile_failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<YandexProfile>;
}

export interface YandexAuthResult {
  trainerId: string;
  email: string;
  role: TrainerRole;
  isNew: boolean;
  token: string;
}

// Find-or-create тренера по email из Yandex
export async function findOrCreateTrainerFromYandex(
  profile: YandexProfile,
): Promise<YandexAuthResult> {
  const email = (profile.default_email || profile.emails?.[0] || `${profile.login}@yandex.ru`)
    .toLowerCase()
    .trim();
  if (!email) throw new Error("no_email_from_yandex");

  const name =
    profile.real_name ||
    profile.display_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.login;

  let [existing] = await db.select().from(trainers).where(eq(trainers.email, email)).limit(1);

  if (!existing) {
    // Создаём с дефолтной ролью pending. Пароль — случайный (нельзя войти по email/password,
    // только через OAuth, пока админ не сбросит).
    const randomPassword = `oauth_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const passwordHash = await hashPassword(randomPassword);
    const [created] = await db
      .insert(trainers)
      .values({
        email,
        passwordHash,
        name,
        notes: `[oauth] зарегистрирован через Yandex (login=${profile.login}, ya_id=${profile.id})`,
      })
      .returning();
    existing = created;
  }

  if (existing.role === "rejected") {
    throw new Error("rejected");
  }

  const token = signTrainerToken({
    id: existing.id,
    email: existing.email,
    role: existing.role as TrainerRole,
  });

  return {
    trainerId: existing.id,
    email: existing.email,
    role: existing.role as TrainerRole,
    isNew: !existing.approvedAt,
    token,
  };
}
