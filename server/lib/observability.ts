// Серверный Sentry + утилиты наблюдаемости. Полностью env-gated: без SENTRY_DSN
// ничего не инициализируется и не падает. release/environment берём из env.
import * as Sentry from "@sentry/node";

let enabled = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log("[sentry] SENTRY_DSN не задан — серверный Sentry выключен");
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "production",
      // Только ошибки: трейсинг/perf не включаем, чтобы не шуметь и не нагружать.
      release: process.env.SENTRY_RELEASE || undefined,
      tracesSampleRate: 0,
    });
    enabled = true;
    console.log("[sentry] серверный Sentry активен");
  } catch (e) {
    console.error("[sentry] init failed:", e);
  }
}

export function sentryEnabled(): boolean {
  return enabled;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* наблюдаемость не должна влиять на работу приложения */
  }
}

// Глобальные перехватчики — необработанные ошибки не должны уходить в пустоту.
export function installProcessHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection:", reason);
    captureException(reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("uncaughtException:", err);
    captureException(err);
  });
}
