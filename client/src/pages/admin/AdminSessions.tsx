import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { authJson, getTrainerToken } from "@/lib/auth";

interface SessionRow {
  id: string;
  name: string;
  accessCode: string;
  status: string;
  scenarioPreset: string;
  maxTeams: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  trainerEmail: string | null;
  trainerName: string | null;
  trainerOrganization: string | null;
  teamCount: number;
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

export default function AdminSessions() {
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 100;

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    void load();
  }, []);

  async function load(off = 0) {
    setLoading(true);
    try {
      const url = new URL("/api/admin/sessions", location.origin);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(off));
      const data = await authJson<{ sessions: SessionRow[]; total: number }>(
        url.pathname + url.search,
      );
      setRows(data.sessions);
      setTotal(data.total ?? data.sessions.length);
      setOffset(off);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← Админка
          </Link>
          <h1 className="text-xl font-semibold mt-2">Все сессии в системе</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
            Сессий пока нет.
          </div>
        )}

        {!loading && rows.length > 0 && total > limit && (
          <div className="flex items-center justify-between mt-4 mb-3 text-sm">
            <span className="text-muted-foreground">
              Сессии {offset + 1}–{Math.min(offset + limit, total)} из {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => load(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
              >
                ← Назад
              </button>
              <button
                onClick={() => load(offset + limit)}
                disabled={offset + limit >= total || loading}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
              >
                Вперёд →
              </button>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-elevate-1 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Сессия</th>
                  <th className="px-4 py-3 font-medium">Тренер</th>
                  <th className="px-4 py-3 font-medium">Код</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium text-center">Команд</th>
                  <th className="px-4 py-3 font-medium">Создана</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-elevate-1">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.scenarioPreset} · max {s.maxTeams} команд
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{s.trainerName || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.trainerEmail}
                        {s.trainerOrganization && ` · ${s.trainerOrganization}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.accessCode}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${STATUS_COLORS[s.status] || ""}`}
                      >
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{s.teamCount}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(s.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
