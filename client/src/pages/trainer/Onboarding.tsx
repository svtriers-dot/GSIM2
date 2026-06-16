import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { authJson, getTrainerToken, getTrainerProfile, logoutTrainer } from "@/lib/auth";

interface Status {
  tourCompleted: boolean;
  quizPassed: boolean;
  quizScore: number | null;
  practicePlayed: boolean;
  practiceFinalCash: number | null;
  isCertified: boolean;
  certifiedAt: string | null;
  certificationPublicId: string | null;
  nextStep: "play_practice" | "take_quiz" | "wait_approval" | "completed" | "rejected" | "suspended";
  role: string;
}

export default function TrainerOnboarding() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profile = getTrainerProfile();

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    void load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const s = await authJson<Status>("/api/trainer/onboarding/status");
      setStatus(s);
      if (s.role === "active" || s.role === "super_admin") {
        navigate("/trainer");
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!status) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  const STEPS = [
    {
      key: "learn",
      label: "Изучить теорию ТОС",
      description: "Краткий ликбез по 5 шагам Голдратта (~5 минут чтения)",
      done: true, // условно — нет жёсткой проверки, можно прочитать когда угодно
      action: { href: "/trainer/learn", label: "Открыть" },
      optional: true,
    },
    {
      key: "practice",
      label: "Сыграть пробный раунд",
      description: `Пройти 1 партию в одиночном режиме с итоговым cash $14000+. ${
        status.practiceFinalCash != null
          ? `Лучший результат: ${status.practiceFinalCash.toLocaleString("ru-RU")} ₽`
          : ""
      }`,
      done: status.practicePlayed,
      action: { href: "/play?practice=1", label: "Играть" },
    },
    {
      key: "quiz",
      label: "Пройти квиз",
      description: `7 вопросов, минимум 5 правильных. ${
        status.quizScore != null ? `Лучший: ${status.quizScore}/7` : ""
      }`,
      done: status.quizPassed,
      action: { href: "/trainer/quiz", label: "Пройти" },
    },
    {
      key: "approval",
      label: "Дождаться апрува",
      description: "Суперадмин проверит онбординг и активирует ваш аккаунт",
      done: status.role === "active" || status.role === "super_admin",
      action: null,
    },
  ];

  const completedCount = STEPS.filter((s) => s.done).length;
  const total = STEPS.length;
  const allMandatoryDone = status.practicePlayed && status.quizPassed;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <a href="/" className="text-sm text-muted-foreground hover:underline">
            ← На главную
          </a>
          <h1 className="text-3xl font-semibold mb-2 mt-2">Онбординг тренера</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.name} · {profile?.email}
          </p>
          <button
            onClick={() => {
              logoutTrainer();
              navigate("/trainer/login");
            }}
            className="text-xs text-muted-foreground hover:underline mt-1"
          >
            Выйти
          </button>
        </header>

        {/* Прогресс-бар */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Прогресс</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} из {total} шагов
            </span>
          </div>
          <div className="h-2 bg-elevate-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completedCount / total) * 100}%` }}
            />
          </div>
        </div>

        {status.role === "rejected" && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6 text-sm text-red-800">
            ❌ Ваша заявка отклонена администратором. Создание сессий невозможно.
          </div>
        )}

        {status.role === "suspended" && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 text-sm text-amber-800">
            ⛔ Доступ временно приостановлен. Обратитесь к администратору.
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`bg-card border rounded-xl p-4 transition ${
                step.done ? "border-green-300" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                    step.done
                      ? "bg-green-500 text-white"
                      : "bg-elevate-2 text-muted-foreground"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium mb-1">
                    {step.label}
                    {step.optional && (
                      <span className="text-xs text-muted-foreground ml-2 font-normal">
                        (опционально)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{step.description}</div>
                </div>
                {step.action && (
                  <Link
                    href={step.action.href}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      step.done
                        ? "border border-border hover:bg-elevate-1"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {step.done ? "Повторить" : step.action.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Wait approval */}
        {allMandatoryDone && status.role === "pending" && (
          <div className="mt-6 bg-blue-50 border border-blue-300 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm text-blue-900 font-medium">
              Все шаги пройдены! Ждём активации от суперадмина.
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Эта страница автоматически обновляется каждые 30 секунд.
            </p>
          </div>
        )}


        <p className="text-xs text-muted-foreground text-center mt-6">
          После активации получите PDF-сертификат с QR-кодом верификации.
        </p>
      </div>
    </div>
  );
}
