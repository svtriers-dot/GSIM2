import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authJson, getTrainerToken } from "@/lib/auth";

export default function NewSession() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [scenarioPreset, setScenarioPreset] = useState<"easy" | "medium" | "hard">("medium");
  const [maxTeams, setMaxTeams] = useState(20);
  const [pin, setPin] = useState("");
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
            pin: pin || undefined,
            expiresInHours,
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
              <option value="easy">Easy — упрощённый Product Mix</option>
              <option value="medium">Medium — стандартный (рекомендуется)</option>
              <option value="hard">Hard — с поломками и колебаниями спроса (V2)</option>
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

          <div>
            <label className="block text-sm font-medium mb-1">
              PIN-код (опционально, 4–6 цифр)
            </label>
            <input
              type="text"
              pattern="\d{4,6}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="123456"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Если задан — участники должны ввести PIN при подключении по коду.
            </p>
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
