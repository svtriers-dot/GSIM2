import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Joyride, ACTIONS, EVENTS, type EventData, STATUS, type Step } from "react-joyride";
import { authJson, authFetch, getTrainerProfile, logoutTrainer, getTrainerToken, setTrainerToken, type TrainerRole } from "@/lib/auth";
import { SkeletonTable, ErrorRetry } from "@/components/Skeleton";

interface SessionRow {
  id: string;
  name: string;
  accessCode: string;
  status: string;
  scenarioPreset: string;
  maxTeams: number;
  startedAt: string | null;
  endedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  lobby: "Лобби",
  running: "Идёт",
  paused: "Пауза",
  ended: "Завершена",
  archived: "Архив",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  lobby: "bg-blue-100 text-blue-700",
  running: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-gray-100 text-gray-500",
  archived: "bg-gray-100 text-gray-400",
};

const tourSteps: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Добро пожаловать в кабинет тренера",
    content:
      "Этот короткий тур (4 шага, ~1 минута) покажет интерфейс кабинета.",
  },
  {
    target: '[data-tour="new-session"]',
    title: "Создать мастер-класс",
    content:
      "Нажмите эту кнопку, чтобы начать новую сессию. Получите 5-значный код, по которому подключатся участники.",
  },
  {
    target: '[data-tour="sessions-table"]',
    title: "Список ваших сессий",
    content:
      "Здесь все мастер-классы. Кликните на любой, чтобы открыть Live-дашборд, дебриф, выдать сертификаты участникам.",
  },
  {
    target: "body",
    placement: "center",
    title: "Готовы провести мастер-класс",
    content:
      "Нажмите «+ Новая сессия», покажите код участникам — и проведите свой первый мастер-класс. Удачи!",
  },
];

export default function TrainerDashboard() {
  const [, navigate] = useLocation();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [tourRunId, setTourRunId] = useState(0);
  const tourCompletionSent = useRef(false);
  const profile = getTrainerProfile();

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    // Проверяем актуальную роль (могла измениться после апрува/саспенда)
    authJson<{
      trainer: { id: string; email: string; name: string; organization: string | null; role: TrainerRole };
      token?: string;
    }>("/api/trainer/auth/me")
      .then((data) => {
        const role = data.trainer.role;
        // Обновляем профиль в localStorage. /auth/me возвращает СВЕЖИЙ token —
        // используем его чтобы заменить stale-JWT (например, токен без role после миграции).
        const tok = data.token ?? getTrainerToken()!;
        setTrainerToken(tok, data.trainer);
        if (role === "pending") {
          navigate("/trainer/onboarding");
          return;
        }
        if (role === "suspended") {
          navigate("/trainer/pending");
          return;
        }
        if (role === "rejected") {
          logoutTrainer();
          navigate("/trainer/login");
          return;
        }
        // active или super_admin — продолжаем
        void load();
      })
      .catch((e) => {
        if (String(e.message).startsWith("401") || String(e.message).startsWith("403")) {
          logoutTrainer();
          navigate("/trainer/login");
          return;
        }
        void load();
      });
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await authJson<{ sessions: SessionRow[] }>("/api/trainer/sessions");
      setSessions(data.sessions);
    } catch (e: any) {
      if (String(e.message).startsWith("401")) {
        logoutTrainer();
        navigate("/trainer/login");
        return;
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    logoutTrainer();
    navigate("/trainer/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">TessTOC · Кабинет тренера</h1>
            <p className="text-sm text-muted-foreground break-words">
              {profile?.name} · {profile?.email}
              {profile?.organization ? ` · ${profile.organization}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {profile?.role === "super_admin" && (
              <Link
                href="/admin"
                className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
              >
                🛡 Админка
              </Link>
            )}
            <Link
              href="/trainer/sessions/new"
              data-tour="new-session"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              + Новая сессия
            </Link>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Joyride
          key={tourRunId}
          steps={tourSteps}
          run={runTour}
          continuous
          options={{
            buttons: ["back", "skip", "close", "primary"],
            showProgress: true,
            skipBeacon: true,
            blockTargetInteraction: true,
            primaryColor: "#11192d",
            zIndex: 10000,
          }}
          locale={{
            back: "Назад",
            close: "Закрыть",
            last: "Готово",
            next: "Дальше",
            nextWithProgress: "Дальше ({current} из {total})",
            skip: "Пропустить",
          }}
          styles={{
            tooltip: { fontFamily: "inherit", maxWidth: "calc(100vw - 32px)" },
            tooltipTitle: { paddingInline: 20 },
            tooltipFooter: { flexWrap: "wrap", gap: 8 },
          }}
          onEvent={(event: EventData, controls) => {
            // Close/Escape cancels the tour; it is not a completed walkthrough.
            if (event.action === ACTIONS.CLOSE) {
              setRunTour(false);
              controls.stop();
              return;
            }
            if (event.type !== EVENTS.TOUR_END) return;
            setRunTour(false);
            if (
              (event.status === STATUS.FINISHED || event.status === STATUS.SKIPPED) &&
              !tourCompletionSent.current
            ) {
              tourCompletionSent.current = true;
              void authFetch("/api/trainer/onboarding/tour-complete", { method: "POST" }).catch(() => {});
            }
          }}
        />
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Мои мастер-классы</h2>
          <button
            type="button"
            disabled={loading || !!error}
            onClick={() => {
              tourCompletionSent.current = false;
              setTourRunId((id) => id + 1);
              setRunTour(true);
            }}
            className="shrink-0 px-3 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1 disabled:opacity-50"
          >
            Подсказки
          </button>
        </div>
        <section data-tour="sessions-table" aria-label="Список мастер-классов">
          {loading && <SkeletonTable rows={4} cols={5} />}

          {!loading && error && (
            <ErrorRetry message={error} onRetry={() => void load()} />
          )}

          {!loading && !error && sessions.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card">
              <p className="text-muted-foreground mb-4">У вас ещё нет ни одной сессии</p>
              <Link
                href="/trainer/sessions/new"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Создать первую
              </Link>
            </div>
          )}

          {!loading && !error && sessions.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-elevate-1 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Название</th>
                    <th className="px-4 py-3 font-medium">Код</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Сложность</th>
                    <th className="px-4 py-3 font-medium">Создана</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-t border-border hover:bg-elevate-1">
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3 font-mono">{s.accessCode}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs ${STATUS_COLORS[s.status] || ""}`}
                        >
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.scenarioPreset}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/trainer/sessions/${s.id}`}
                          className="text-primary hover:underline"
                        >
                          Открыть →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
