import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authJson, getTrainerToken } from "@/lib/auth";

export default function NewSession() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [scenarioPreset, setScenarioPreset] = useState<"easy" | "medium" | "hard" | "custom">("medium");
  const [maxTeams, setMaxTeams] = useState(20);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customStartingCash, setCustomStartingCash] = useState<string>("");
  const [customFixedExpenses, setCustomFixedExpenses] = useState<string>("");
  const [customTotalDays, setCustomTotalDays] = useState<string>("");
  const [customDayDurationSeconds, setCustomDayDurationSeconds] = useState<string>("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!getTrainerToken()) {
    navigate("/trainer/login");
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authJson<{ session: { id: string; accessCode: string } }>(
        "/api/trainer/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            scenarioPreset,
            maxTeams,
            expiresInHours,
            configOverrides: {
              ...(customStartingCash ? { startingCash: parseInt(customStartingCash) } : {}),
              ...(customFixedExpenses ? { fixedExpenses: parseInt(customFixedExpenses) } : {}),
              ...(customTotalDays ? { totalDays: parseInt(customTotalDays) } : {}),
              ...(customDayDurationSeconds
                ? { dayDurationSeconds: parseInt(customDayDurationSeconds) }
                : {}),
            },
          }),
        },
      );
      navigate(`/trainer/sessions/${data.session.id}`);
    } catch (e: any) {
      setError(e.message || "Не удалось создать сессию");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/trainer" className="text-sm text-muted-foreground hover:underline">
            ← Назад в кабинет
          </Link>
          <h1 className="text-xl font-semibold mt-2">Новый мастер-класс</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={submit} className="space-y-5 bg-card border border-border rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="Мастер-класс ТОС, ВТБ 06.05"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Будет видно тренеру и участникам в лобби.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Сложность сценария</label>
            <select
              value={scenarioPreset}
              onChange={(e) => setScenarioPreset(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value="easy">Easy — стартовый капитал $15k, расходы $8k/нед, 4 дня</option>
              <option value="medium">Medium — стартовый $10k, расходы $11k/нед, 5 дней (рекомендуется)</option>
              <option value="hard">Hard — стартовый $7k, расходы $14k/нед, 6 дней</option>
              <option value="custom">Custom — задать параметры вручную ниже</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Макс. команд</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxTeams}
                onChange={(e) => setMaxTeams(parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                1 компьютер = 1 команда
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Срок жизни кода (часов)</label>
              <input
                type="number"
                min={1}
                max={168}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 24)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">До 7 дней</p>
            </div>
          </div>

          <div className="border border-border rounded-lg">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium hover:bg-elevate-1 rounded-lg"
            >
              <span>⚙ Расширенные настройки {scenarioPreset === "custom" && "(обязательны)"}</span>
              <span className="text-muted-foreground">{advancedOpen ? "▴" : "▾"}</span>
            </button>
            {(advancedOpen || scenarioPreset === "custom") && (
              <div className="border-t border-border p-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Поля переопределяют значения пресета. Пустые — используют пресет.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Стартовый капитал, $
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={100000}
                      step={500}
                      value={customStartingCash}
                      onChange={(e) => setCustomStartingCash(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                      placeholder="из пресета"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Постоянные расходы, $/нед
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={100000}
                      step={500}
                      value={customFixedExpenses}
                      onChange={(e) => setCustomFixedExpenses(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                      placeholder="из пресета"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Дней в раунде
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={customTotalDays}
                      onChange={(e) => setCustomTotalDays(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                      placeholder="из пресета"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Длительность дня, сек
                    </label>
                    <input
                      type="number"
                      min={60}
                      max={1800}
                      step={30}
                      value={customDayDurationSeconds}
                      onChange={(e) => setCustomDayDurationSeconds(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                      placeholder="из пресета"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {loading ? "Создаю..." : "Создать сессию"}
            </button>
            <Link
              href="/trainer"
              className="px-5 py-2.5 rounded-lg border border-border hover:bg-elevate-1"
            >
              Отмена
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
