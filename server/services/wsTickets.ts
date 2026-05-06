// MVP-2 Security: одноразовые билеты для WebSocket вместо JWT в URL.
//
// Flow:
//   1. Клиент с валидным JWT/device_token делает POST /api/.../ws-ticket
//   2. Сервер генерирует nonce (UUID), кладёт в Map с TTL 60s
//   3. Клиент использует nonce как ?ticket=NONCE для wss://
//   4. Сервер проверяет/удаляет nonce при upgrade (one-shot)
//
// Преимущество перед JWT в URL:
//   - JWT не попадает в access-логи nginx
//   - Если nonce утечёт из логов — действует 60 секунд и одноразово
//   - Нет необходимости в Redis (in-memory Map хватает)

import { randomUUID } from "crypto";

const TTL_MS = 60_000;
const MAX_TICKETS = 10_000;

type TrainerTicket = {
  kind: "trainer";
  trainerId: string;
  sessionId: string;
  expiresAt: number;
};

type TeamTicket = {
  kind: "team";
  teamId: string;
  expiresAt: number;
};

export type WsTicket = TrainerTicket | TeamTicket;

const store = new Map<string, WsTicket>();

export function issueTrainerTicket(trainerId: string, sessionId: string): string {
  cleanup();
  if (store.size >= MAX_TICKETS) {
    // Лимит безопасности: при переполнении удаляем половину старейших
    purgeHalf();
  }
  const nonce = randomUUID();
  store.set(nonce, {
    kind: "trainer",
    trainerId,
    sessionId,
    expiresAt: Date.now() + TTL_MS,
  });
  return nonce;
}

export function issueTeamTicket(teamId: string): string {
  cleanup();
  if (store.size >= MAX_TICKETS) purgeHalf();
  const nonce = randomUUID();
  store.set(nonce, {
    kind: "team",
    teamId,
    expiresAt: Date.now() + TTL_MS,
  });
  return nonce;
}

// One-shot consume: возвращает ticket и удаляет из store.
export function consumeTicket(nonce: string): WsTicket | null {
  const t = store.get(nonce);
  if (!t) return null;
  store.delete(nonce);
  if (t.expiresAt < Date.now()) return null;
  return t;
}

function cleanup() {
  const now = Date.now();
  for (const [k, v] of Array.from(store.entries())) {
    if (v.expiresAt < now) store.delete(k);
  }
}

function purgeHalf() {
  const sorted = Array.from(store.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  const half = Math.floor(sorted.length / 2);
  for (let i = 0; i < half; i++) store.delete(sorted[i][0]);
}

// периодический cleanup чтобы Map не разрастался (раз в 5 минут)
setInterval(cleanup, 5 * 60 * 1000);
