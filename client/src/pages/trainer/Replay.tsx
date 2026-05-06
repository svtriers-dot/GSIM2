import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { authJson, getTrainerToken } from "@/lib/auth";

interface RoundDTO {
  id: string;
  roundNumber: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
}

interface DecisionDTO {
  id: string;
  teamId: string;
  roundId: string;
  timestamp: string;
  actionType: string;
  payload: Record<string, unknown>;
}

interface TeamRoundResultDTO {
  teamId: string;
  roundId: string;
  finalCash: number;
  throughput: number;
  inventory: number;
  operatingExpense: number;
  bottleneckStationId: string | null;
  rankInRound: number;
}

const ACTION_LABELS: Record<string, string> = {
  place_machine: "Поставил станок",
  remove_machine: "Снял станок",
  buy_rm: "Купил сырьё",
  set_priority: "Изменил приоритет",
  start_production: "Запустил производство",
  stop_production: "Остановил производство",
  set_buffer: "Изменил буфер",
};

const ACTION_ICONS: Record<string, string> = {
  place_machine: "➕",
  remove_machine: "➖",
  buy_rm: "📦",
  set_priority: "🔀",
  start_production: "▶",
  stop_production: "⏹",
  set_buffer: "📊",
};

export default function TrainerReplay() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/trainer/sessions/:sessionId/replay/:teamId");
  const sessionId = params?.sessionId;
  const teamId = params?.teamId;
  const [team, setTeam] = useState<{ id: string; name: string; color: string } | null>(null);
  const [rounds, setRounds] = useState<RoundDTO[]>([]);
  const [decisions, setDecisions] = useState<DecisionDTO[]>([]);
  const [results, setResults] = useState<TeamRoundResultDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    if (!sessionId || !teamId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, teamId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await authJson<{
        team: { id: string; name: string; color: string };
        rounds: RoundDTO[];
        decisions: DecisionDTO[];
        results: TeamRoundResultDTO[];
      }>(`/api/trainer/sessions/${sessionId}/teams/${teamId}/replay`);
      setTeam(data.team);
      setRounds(data.rounds);
      setDecisions(data.decisions);
      setResults(data.results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Группируем decisions по раундам
  const grouped = useMemo(() => {
    const filtered = filter
      ? decisions.filter((d) => d.actionType === filter)
      : decisions;
    return rounds.map((r) => ({
      round: r,
      result: results.find((res) => res.roundId === r.id),
      decisions: filtered.filter((d) => d.roundId === r.id),
    }));
  }, [rounds, decisions, results, filter]);

  // Уникальные типы действий для фильтра
  const actionTypes = useMemo(() => {
    return Array.from(new Set(decisions.map((d) => d.actionType))).sort();
  }, [decisions]);

  if (!sessionId || !teamId) return <div className="p-8">Невалидная ссылка</div>;
  if (loading) return <div className="p-8 text-center">Загрузка...</div>;
  if (error)
    return (
      <div className="p-8">
        <Link href={`/trainer/sessions/${sessionId}`}>← К сессии</Link>
        <div className="mt-4 text-red-600">{error}</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link
            href={`/trainer/sessions/${sessionId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← К сессии
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-xl font-semibold">
                Replay команды:{" "}
                <span style={{ color: team?.color }}>{team?.name}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Хронология решений по раундам
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Фильтр по типу действия */}
        {actionTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground mr-2">Фильтр:</span>
            <button
              onClick={() => setFilter("")}
              className={`px-3 py-1 rounded-full text-xs ${
                filter === "" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
              }`}
            >
              Все ({decisions.length})
            </button>
            {actionTypes.map((t) => {
              const count = decisions.filter((d) => d.actionType === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    filter === t ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                  }`}
                >
                  {ACTION_ICONS[t] || "•"} {ACTION_LABELS[t] || t} ({count})
                </button>
              );
            })}
          </div>
        )}

        {grouped.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
            Нет данных для replay (раунды не запускались).
          </div>
        ) : (
          grouped.map(({ round, result, decisions: roundDecisions }) => {
            const startedAt = round.startedAt ? new Date(round.startedAt) : null;
            return (
              <div key={round.id} className="bg-card border border-border rounded-xl">
                <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      Раунд {round.roundNumber}
                      <span
                        className={`ml-2 inline-block px-2 py-0.5 rounded text-xs ${
                          round.status === "ended"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {round.status === "ended" ? "завершён" : round.status}
                      </span>
                    </div>
                    {startedAt && (
                      <div className="text-xs text-muted-foreground">
                        Старт: {startedAt.toLocaleTimeString("ru-RU")}
                      </div>
                    )}
                  </div>
                  {result && (
                    <div className="text-right text-sm">
                      <div>
                        <span className="text-muted-foreground">Cash:</span>{" "}
                        <span className={`font-mono font-semibold ${result.finalCash < 0 ? "text-red-600" : ""}`}>
                          ${result.finalCash.toLocaleString("en-US")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Throughput:</span>{" "}
                        <span className="font-mono">{result.throughput.toLocaleString("en-US")}</span>
                        {" · "}
                        <span className="text-muted-foreground">Rank:</span>{" "}
                        <span className="font-mono">#{result.rankInRound}</span>
                      </div>
                    </div>
                  )}
                </div>

                {roundDecisions.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                    {filter
                      ? "Нет действий этого типа в раунде"
                      : "Команда не сделала ни одного действия"}
                  </div>
                ) : (
                  <ol className="divide-y divide-border">
                    {roundDecisions.map((d) => (
                      <DecisionRow
                        key={d.id}
                        decision={d}
                        startedAt={startedAt}
                      />
                    ))}
                  </ol>
                )}
              </div>
            );
          })
        )}

        <p className="text-xs text-muted-foreground text-center">
          Replay строится по append-only журналу `decisions`. Восстановление полного
          состояния игры на любой момент — V2 (Goldratt-замедление).
        </p>
      </main>
    </div>
  );
}

function DecisionRow({
  decision,
  startedAt,
}: {
  decision: DecisionDTO;
  startedAt: Date | null;
}) {
  const ts = new Date(decision.timestamp);
  const elapsedMs = startedAt ? ts.getTime() - startedAt.getTime() : 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const mm = Math.floor(elapsedSec / 60);
  const ss = elapsedSec % 60;

  return (
    <li className="px-4 py-2 hover:bg-elevate-1 flex items-start gap-3 text-sm">
      <span className="font-mono text-xs text-muted-foreground w-16 pt-0.5">
        {startedAt ? `+${mm}:${String(ss).padStart(2, "0")}` : ts.toLocaleTimeString("ru-RU")}
      </span>
      <span className="text-base mt-0.5 w-6">
        {ACTION_ICONS[decision.actionType] || "•"}
      </span>
      <div className="flex-1">
        <div>
          <span className="font-medium">{ACTION_LABELS[decision.actionType] || decision.actionType}</span>
        </div>
        {Object.keys(decision.payload || {}).length > 0 && (
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {Object.entries(decision.payload)
              .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
              .join(" · ")}
          </div>
        )}
      </div>
    </li>
  );
}
