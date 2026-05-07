import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import Joyride, { type CallBackProps, STATUS, type Step } from "react-joyride";
import { authJson, authFetch, downloadAuthFile, getTrainerProfile, logoutTrainer, getTrainerToken, setTrainerToken, type TrainerRole } from "@/lib/auth";
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
      "Вы прошли сертификацию TessTOC. Этот короткий тур (5 шагов, ~1 минута) покажет интерфейс кабинета.",
  },
  {
    target: '[data-tour="new-session"]',
    title: "Создать мастер-класс",
    content:
      "Нажмите эту кнопку, чтобы начать новую сессию. Получите 6-значный код, по которому подключатся участники.",
  },
  {
    target: '[data-tour="sessions-table"]',
    title: "Список ваших сессий",
    content:
      "Здесь все мастер-классы. Кликните на любой, чтобы открыть Live-дашборд, дебриф, выдать сертификаты участникам.",
  },
  {
    target: '[data-tour="certificate-link"]',
    title: "Ваш сертификат",
    content:
      "Скачайте PDF своего тренерского сертификата с QR-кодом верификации. Можно добавить в LinkedIn.",
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">TessTOC · Кабинет тренера</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.name} · {profile?.email}
              {profile?.organization ? ` · ${profile.organization}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              type="button"
              onClick={() => downloadAuthFile("/api/trainer/certification/pdf", "TessTOC_certificate.pdf")}
              data-tour="certificate-link"
              className="hidden md:inline-block px-3 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
              title="Скачать сертификат тренера"
            >
              🎓 Сертификат
            </button>
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
          steps={tourSteps}
          run={runTour}
          continuous
          showProgress
          showSkipButton
          locale={{
            back: "Назад",
            close: "Закрыть",
            last: "Готово",
            next: "Дальше",
            skip: "Пропустить",
          }}
          styles={{
            options: {
              primaryColor: "#11192d",
              zIndex: 10000,
            },
          }}
          callback={(d: CallBackProps) => {
            if (d.status === STATUS.FINISHED || d.status === STATUS.SKIPPED) {
              setRunTour(false);
              void authFetch("/api/trainer/onboarding/tour-complete", { method: "POST" });
            }
          }}
        />
        <h2 className="text-lg font-semibold mb-4">Мои мастер-классы</h2>

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
          <div data-tour="sessions-table" className="border border-border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm">
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
      </main>
    </div>
  );
}
