// Клиентский Sentry. DSN берётся в рантайме из /api/client-config (env-gated):
// без DSN ничего не инициализируется и приложение работает как обычно.
import * as Sentry from "@sentry/react";

let enabled = false;

export async function bootstrapSentry(): Promise<void> {
  try {
    const res = await fetch("/api/client-config", { cache: "no-store" });
    if (!res.ok) return;
    const cfg = await res.json();
    if (!cfg?.sentryDsn) return;
    Sentry.init({
      dsn: cfg.sentryDsn,
      environment: cfg.environment || "production",
      release: cfg.release || undefined,
      // Только ошибки: ни трейсинга, ни session replay.
      tracesSampleRate: 0,
    });
    enabled = true;
  } catch {
    /* наблюдаемость не должна ломать загрузку приложения */
  }
}

export function captureException(err: unknown, ctx?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  } catch {
    /* no-op */
  }
}

export { Sentry };
