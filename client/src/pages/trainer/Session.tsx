import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { getAllMachineIds, getAllProductIds, getMachineLabel } from "@/lib/gameConfig";
import { authJson, getTrainerToken } from "@/lib/auth";
import { TrainerSocket, type SessionLiveState, type ConnectionStatus as WsStatus } from "@/lib/trainerSocket";
import { confirmAction, promptAction } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "@/components/ConnectionStatus";

interface SessionDTO {
  id: string;
  trainerId: string;
  name: string;
  accessCode: string;
  pin: string | null;
  scenarioPreset: string;
  status: string;
  maxTeams: number;
  startedAt: string | null;
  endedAt: string | null;
  expiresAt: string;
}

interface TeamDTO {
  id: string;
  name: string;
  color: string;
  members: { id: string; fullName: string }[];
  factoryState: Record<string, unknown>;
  joinedAt: string;
  lastSeenAt: string;
}

type Tab = "lobby" | "live" | "debrief" | "settings";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  lobby: "Лобби (приём команд)",
  running: "Идёт",
  paused: "Пауза",
  ended: "Завершена",
  archived: "Архив",
};

export default function TrainerSession() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/trainer/sessions/:id");
  const sessionId = params?.id;
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [liveState, setLiveState] = useState<SessionLiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("lobby");
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [alerts, setAlerts] = useState<Array<{ id: string; kind: string; teamName: string; teamId: string; cash?: number; from?: string | null; to?: string | null; timestamp: number }>>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const socketRef = useRef<TrainerSocket | null>(null);

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    if (!sessionId) return;
    void loadInitial();
    const ws = new TrainerSocket(sessionId);
    void ws.connect();
    ws.onStatus(setWsStatus);
    ws.on((event) => {
      if (event.type === "session.state_update") {
        setLiveState(event.payload);
      } else if (event.type === "team.joined") {
        setLiveState((prev) =>
          prev
            ? {
                ...prev,
                teams: [
                  ...prev.teams.filter((t) => t.id !== event.payload.team.id),
                  event.payload.team,
                ],
              }
            : prev,
        );
        // refresh
        void refreshSession();
      } else if (event.type === "team.metric_update") {
        setLiveState((prev) =>
          prev
            ? {
                ...prev,
                teams: prev.teams.map((t) =>
                  t.id === event.payload.teamId ? { ...t, metrics: event.payload.metrics } : t,
                ),
              }
            : prev,
        );
      } else if (event.type === "alert") {
        setAlerts((prev) => [...prev, { id: `${event.payload.timestamp}-${Math.random()}`, ...event.payload }]);
      }
    });
    socketRef.current = ws;
    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadInitial() {
    try {
      const data = await authJson<{ session: SessionDTO; teams: TeamDTO[] }>(
        `/api/trainer/sessions/${sessionId}`,
      );
      setSession(data.session);
      setTeams(data.teams);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSession() {
    try {
      const data = await authJson<{ session: SessionDTO; teams: TeamDTO[] }>(
        `/api/trainer/sessions/${sessionId}`,
      );
      setSession(data.session);
      setTeams(data.teams);
    } catch {}
  }

  async function lifecycle(action: "start" | "pause" | "resume" | "end" | "reset-round") {
    setBusy(action);
    try {
      await authJson(`/api/trainer/sessions/${sessionId}/${action}`, { method: "POST" });
      await refreshSession();
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function broadcast() {
    if (!broadcastMsg.trim()) return;
    setBusy("broadcast");
    try {
      await authJson(`/api/trainer/sessions/${sessionId}/broadcast`, {
        method: "POST",
        body: JSON.stringify({ message: broadcastMsg }),
      });
      setBroadcastMsg("");
    } catch (e: any) {
      toast({ title: "Ошибка broadcast", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function snapshot() {
    const r = await promptAction(
      "Snapshot текущего состояния",
      "Зафиксируйте педагогический момент — потом сможете вернуться к нему в дебрифе.",
      "Метка (что сейчас на экране?)",
    );
    if (!r.confirmed || !r.promptValue) return;
    setBusy("snapshot");
    try {
      await authJson(`/api/trainer/sessions/${sessionId}/snapshot`, {
        method: "POST",
        body: JSON.stringify({ label: r.promptValue }),
      });
      toast({ title: "Snapshot сохранён", description: r.promptValue });
    } catch (e: any) {
      toast({ title: "Ошибка snapshot", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function kick(teamId: string, teamName: string) {
    const ok = await confirmAction(
      `Удалить команду «${teamName}»?`,
      "Их подключение будет разорвано — переподключиться смогут только повторно по коду.",
      true,
    );
    if (!ok) return;
    setBusy("kick");
    try {
      await authJson(`/api/trainer/sessions/${sessionId}/kick`, {
        method: "POST",
        body: JSON.stringify({ teamId }),
      });
      toast({ title: "Команда удалена", description: teamName });
      await refreshSession();
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const liveTeams = useMemo(() => liveState?.teams ?? [], [liveState]);
  const teamsForUI = liveTeams.length > 0 ? liveTeams : teams;

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;
  if (error || !session)
    return (
      <div className="p-8">
        <Link href="/trainer">← Кабинет</Link>
        <div className="mt-4 text-red-600">{error || "Сессия не найдена"}</div>
      </div>
    );

  const status = liveState?.status || session.status;
  const isLobby = status === "lobby" || status === "draft";
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isEnded = status === "ended" || status === "archived";

  return (
    <div className="min-h-screen bg-background">
      <ConnectionStatus status={wsStatus} />
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/trainer" className="text-sm text-muted-foreground hover:underline">
            ← Кабинет
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-xl font-semibold">{session.name}</h1>
              <p className="text-sm text-muted-foreground">
                Статус: {STATUS_LABELS[status] || status} · команд: {teamsForUI.length}/{session.maxTeams}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Код входа</div>
              <div className="text-3xl font-mono font-bold tracking-wider">
                {session.accessCode}
              </div>

            </div>
          </div>

          <div className="flex gap-1 mt-4 border-b border-border -mb-px">
            {(
              [
                ["lobby", "Lobby"],
                ["live", "Live"],
                ["debrief", "Debrief"],
                ["settings", "Settings"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  tab === key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Alerts-панель */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setAlertsOpen(!alertsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-100 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-medium text-amber-900">
                    Алерты ({alerts.length})
                  </div>
                  <div className="text-xs text-amber-700">
                    {alerts[alerts.length - 1].kind === "cash_negative"
                      ? `${alerts[alerts.length - 1].teamName}: cash ушёл в минус`
                      : alerts[alerts.length - 1].kind === "bottleneck_changed"
                        ? `${alerts[alerts.length - 1].teamName}: bottleneck → ${alerts[alerts.length - 1].to}`
                        : "Новый алерт"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlerts([]);
                  }}
                  className="text-xs text-amber-700 hover:text-amber-900 px-2 py-1"
                >
                  Очистить
                </button>
                <span className="text-amber-600">{alertsOpen ? "▴" : "▾"}</span>
              </div>
            </button>
            {alertsOpen && (
              <ul className="border-t border-amber-200 divide-y divide-amber-100 max-h-72 overflow-y-auto">
                {[...alerts].reverse().map((a) => (
                  <li key={a.id} className="px-4 py-2 text-sm">
                    <span className="text-xs text-amber-700 font-mono mr-3">
                      {new Date(a.timestamp).toLocaleTimeString("ru-RU")}
                    </span>
                    <span className="font-medium">{a.teamName}</span>:{" "}
                    {a.kind === "cash_negative" && (
                      <>
                        cash ушёл в минус —{" "}
                        <span className="font-mono text-red-700">{a.cash?.toLocaleString("ru-RU")} ₽</span>
                      </>
                    )}
                    {a.kind === "bottleneck_changed" && (
                      <>
                        bottleneck сменился{" "}
                        {a.from && <span className="font-mono">{a.from} →</span>}{" "}
                        <span className="font-mono text-amber-700">{a.to}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Контрольная панель таймера */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-2 items-center">
          {isLobby && (
            <button
              onClick={() => lifecycle("start")}
              disabled={!!busy || teamsForUI.length === 0}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
            >
              ▶ Старт
            </button>
          )}
          {isRunning && (
            <>
              <button
                onClick={() => lifecycle("pause")}
                disabled={!!busy}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50"
              >
                ⏸ Пауза
              </button>
              <button
                onClick={() => lifecycle("end")}
                disabled={!!busy}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
              >
                ⏹ Завершить
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button
                onClick={() => lifecycle("resume")}
                disabled={!!busy}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
              >
                ▶ Продолжить
              </button>
              <button
                onClick={() => lifecycle("end")}
                disabled={!!busy}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
              >
                ⏹ Завершить
              </button>
            </>
          )}
          {(isPaused || isEnded || isRunning) && (
            <button
              onClick={() => lifecycle("reset-round")}
              disabled={!!busy}
              className="px-4 py-2 rounded-lg border border-border font-medium disabled:opacity-50"
            >
              🔄 Reset round
            </button>
          )}
          {!isEnded && (
            <>
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="text"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Сообщение всем командам..."
                  className="px-3 py-2 rounded-lg border border-border bg-background w-72"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void broadcast();
                  }}
                />
                <button
                  onClick={() => void broadcast()}
                  disabled={!!busy || !broadcastMsg.trim()}
                  className="px-3 py-2 rounded-lg border border-border disabled:opacity-50"
                >
                  📢 Broadcast
                </button>
                <button
                  onClick={() => void snapshot()}
                  disabled={!!busy}
                  className="px-3 py-2 rounded-lg border border-border disabled:opacity-50"
                >
                  📸 Snapshot
                </button>
              </div>
            </>
          )}
        </div>

        {/* V2 forced events panel — только когда сессия running */}
        {isRunning && (
          <ForcedEventsPanel sessionId={session.id} teams={teamsForUI as any} />
        )}

        {/* Контент таб */}
        {tab === "lobby" && (
          <LobbyTab session={session} teams={teamsForUI as any} onKick={kick} />
        )}
        {tab === "live" && <LiveTab teams={liveTeams.length ? liveTeams : (teams as any)} />}
        {tab === "debrief" && <DebriefTab sessionId={session.id} liveTeams={teamsForUI as any} />}
        {tab === "settings" && <SettingsTab session={session} configOverrides={(session as any).configOverrides ?? {}} onSavedConfig={(next) => setSession((s) => s ? ({ ...s, configOverrides: next } as any) : s)} />}
      </main>
    </div>
  );
}

function LobbyTab({
  session,
  teams,
  onKick,
}: {
  session: SessionDTO;
  teams: any[];
  onKick: (id: string, name: string) => void;
}) {
  return (
    <div>
      <div className="bg-card border border-border rounded-xl p-8 mb-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Покажите этот код участникам:</p>
        <div className="text-7xl font-mono font-bold tracking-widest">{session.accessCode}</div>
        <p className="text-sm text-muted-foreground mt-4">
          Заходить на: <span className="font-mono">{location.host}/play/join</span>
        </p>
      </div>

      <h3 className="text-lg font-semibold mb-3">
        Подключённые команды ({teams.length}/{session.maxTeams})
      </h3>

      {teams.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
          Команд пока нет. Подключатся по коду — появятся здесь автоматически.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => (
            <div
              key={t.id}
              className="bg-card border border-border rounded-xl p-4"
              style={{ borderLeftColor: t.color, borderLeftWidth: 6 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Участников: {t.members?.length || 0}
                  </div>
                </div>
                <button
                  onClick={() => onKick(t.id, t.name)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Удалить
                </button>
              </div>
              <ul className="text-sm space-y-0.5">
                {(t.members || []).map((m: any) => (
                  <li key={m.id || m.fullName}>· {m.fullName}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveTab({ teams }: { teams: any[] }) {
  if (teams.length === 0)
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
        Нет активных команд для мониторинга.
      </div>
    );
  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {teams.map((t) => {
          const m = t.metrics || {};
          const cash = m.cash ?? 0;
          return (
            <div
              key={t.id}
              className="bg-card border border-border rounded-xl p-4"
              style={{ borderLeftColor: t.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">{t.name}</div>
                {m.bottleneckStationId && (
                  <span className="text-xs text-amber-600 font-mono">⚠ {m.bottleneckStationId}{m.bottleneckQueue ? ` ·${m.bottleneckQueue}` : ""}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Cash</div>
                  <div className={`font-mono font-semibold ${cash < 0 ? "text-red-600" : ""}`}>
                    ${cash.toLocaleString("en-US")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Throughput</div>
                  <div className="font-mono">{m.throughput ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">WIP</div>
                  <div className="font-mono">{m.inventory ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">OE</div>
                  <div className="font-mono">${(m.operatingExpense ?? 0).toLocaleString("en-US")}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground truncate">
                {(t.members || []).map((mm: any) => mm.fullName).join(", ")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-elevate-1 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Команда</th>
              <th className="px-4 py-3 font-medium text-right">
                <MetricHeader label="Cash, ₽" hint="Сколько денег у команды сейчас. Если в минус — операционные расходы превышают throughput. По ТОС: throughput < operating expense." />
              </th>
              <th className="px-4 py-3 font-medium text-right">
                <MetricHeader label="Throughput" hint="Throughput — выручка от продажи готовой продукции минус сырьё. Главный показатель ТОС: максимизируется через расширение узкого места." />
              </th>
              <th className="px-4 py-3 font-medium text-right">
                <MetricHeader label="WIP / Inv" hint="Work in Progress / Inventory — полуфабрикаты в буферах между станциями. Высокий WIP перед станцией указывает на узкое место." />
              </th>
              <th className="px-4 py-3 font-medium text-right">
                <MetricHeader label="OE" hint="Operating Expense — операционные расходы (сырьё + постоянка). По ТОС снижают только после максимизации throughput." />
              </th>
              <th className="px-4 py-3 font-medium">
                <MetricHeader label="Bottleneck" hint="Станция-узкое место: ограничивает throughput всей системы. По ТОС 5 шагов: найти, использовать максимально, подчинить остальные, расширить, не дать инерции стать новым ограничением." />
              </th>
              <th className="px-4 py-3 font-medium">Состав</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const m = t.metrics || {};
              const cash = m.cash ?? 0;
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                      style={{ background: t.color }}
                    />
                    <span className="font-medium">{t.name}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${cash < 0 ? "text-red-600" : ""}`}>
                    ${cash.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{m.throughput ?? 0}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.inventory ?? 0}</td>
                  <td className="px-4 py-3 text-right font-mono">${(m.operatingExpense ?? 0).toLocaleString("en-US")}</td>
                  <td className="px-4 py-3">
                    {m.bottleneckStationId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-mono text-xs font-semibold">
                        ⚠ {m.bottleneckStationId}
                        {m.bottleneckQueue ? <span className="text-amber-600/80">очередь {m.bottleneckQueue}</span> : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {(t.members || []).map((mm: any) => mm.fullName).join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
interface RoundDTO {
  id: string;
  roundNumber: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
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

interface DebriefTeamDTO {
  id: string;
  name: string;
  color: string;
  members: string[];
}

function DebriefTab({
  sessionId,
  liveTeams,
}: {
  sessionId: string;
  liveTeams: any[];
}) {
  const [rounds, setRounds] = useState<RoundDTO[]>([]);
  const [debriefTeams, setDebriefTeams] = useState<DebriefTeamDTO[]>([]);
  const [results, setResults] = useState<TeamRoundResultDTO[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([
        authJson<{ rounds: RoundDTO[]; teams: DebriefTeamDTO[]; results: TeamRoundResultDTO[] }>(
          `/api/trainer/sessions/${sessionId}/rounds`,
        ),
        authJson<{ snapshots: any[] }>(`/api/trainer/sessions/${sessionId}/snapshots`),
      ]);
      setRounds(r.rounds);
      setDebriefTeams(r.teams);
      setResults(r.results);
      setSnapshots(s.snapshots);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Только закрытые раунды для сравнения
  const finishedRounds = rounds.filter((r) => r.status === "ended");

  // Если ни один раунд не завершён — показываем live leaderboard как раньше
  if (finishedRounds.length === 0) {
    const sorted = [...liveTeams].sort(
      (a, b) => (b.metrics?.cash ?? 0) - (a.metrics?.cash ?? 0),
    );
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Текущий рейтинг</h3>
          <button
            onClick={() => load()}
            className="text-xs text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            ↻ Обновить
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Закройте текущий раунд кнопкой «⏹ Завершить» или «🔄 Reset round» — здесь
          появится сравнение с предыдущими прогонами.
        </p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevate-1 text-left">
              <tr>
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Команда</th>
                <th className="px-4 py-3 font-medium text-right">Cash, ₽</th>
                <th className="px-4 py-3 font-medium text-right">Throughput</th>
                <th className="px-4 py-3 font-medium">Состав</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">
                    {i === 0 && "🥇"}
                    {i === 1 && "🥈"}
                    {i === 2 && "🥉"}
                    {i > 2 && i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                      style={{ background: t.color }}
                    />
                    <span className="font-medium">{t.name}</span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      (t.metrics?.cash ?? 0) < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {(t.metrics?.cash ?? 0).toLocaleString("ru-RU")} ₽
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {t.metrics?.throughput ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {(t.members || []).map((m: any) => m.fullName).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>
    );
  }

  // Один или несколько закрытых раундов — таблица сравнения
  const lastRound = finishedRounds[finishedRounds.length - 1];
  const prevRound = finishedRounds.length > 1 ? finishedRounds[finishedRounds.length - 2] : null;

  // Map: teamId → лучший результат за все раунды (для рейтинга по последнему)
  const lastResults = results.filter((r) => r.roundId === lastRound.id);
  const prevResults = prevRound
    ? results.filter((r) => r.roundId === prevRound.id)
    : [];

  // Сортировка по rank в последнем раунде
  const teamsByRank = [...debriefTeams].sort((a, b) => {
    const rankA = lastResults.find((r) => r.teamId === a.id)?.rankInRound ?? 999;
    const rankB = lastResults.find((r) => r.teamId === b.id)?.rankInRound ?? 999;
    return rankA - rankB;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {prevRound ? `Сравнение раунда ${prevRound.roundNumber} → ${lastRound.roundNumber}` : `Итог раунда ${lastRound.roundNumber}`}
        </h3>
        <button
          onClick={() => load()}
          className="text-xs text-muted-foreground hover:text-foreground"
          disabled={loading}
        >
          {loading ? "..." : "↻ Обновить"}
        </button>
      </div>

      {prevRound && (
        <p className="text-sm text-muted-foreground">
          Зелёным — улучшение от прошлого раунда (классическая ТОС-механика
          «играем → дебриф → играем снова с осознанием»).
        </p>
      )}

      {/* Mobile: simplified cards */}
      <div className="md:hidden space-y-3">
        {teamsByRank.map((t, i) => {
          const prev = prevResults.find((r) => r.teamId === t.id);
          const last = lastResults.find((r) => r.teamId === t.id);
          const dt = prev && last ? last.throughput - prev.throughput : null;
          return (
            <div
              key={t.id}
              className="bg-card border border-border rounded-xl p-4"
              style={{ borderLeftColor: t.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-mono mr-2">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span className="font-semibold">{t.name}</span>
                </div>
                {last?.bottleneckStationId && (
                  <span className="text-xs text-amber-600 font-mono">⚠ {last.bottleneckStationId}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Cash R{lastRound.roundNumber}</div>
                  <div className={`font-mono font-semibold ${(last?.finalCash ?? 0) < 0 ? "text-red-600" : ""}`}>
                    {(last?.finalCash ?? 0).toLocaleString("ru-RU")} ₽
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Throughput R{lastRound.roundNumber}</div>
                  <div className="font-mono font-semibold">{last?.throughput.toLocaleString("en-US") ?? "—"}</div>
                </div>
                {prevRound && dt != null && (
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Δ throughput</div>
                    <div
                      className={`font-mono ${dt > 0 ? "text-green-700" : dt < 0 ? "text-red-600" : "text-muted-foreground"}`}
                    >
                      {dt > 0 ? "+" : ""}
                      {dt.toLocaleString("en-US")}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2 truncate">
                {t.members.join(", ")}
              </div>
              <div className="mt-2">
                <Link
                  href={`/trainer/sessions/${sessionId}/replay/${t.id}`}
                  className="text-primary hover:underline text-xs"
                >
                  Replay →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: comparison table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-elevate-1 text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-12">#</th>
              <th className="px-4 py-3 font-medium">Команда</th>
              {prevRound && (
                <>
                  <th className="px-4 py-3 font-medium text-right">
                    R{prevRound.roundNumber} cash
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    R{prevRound.roundNumber} throughput
                  </th>
                </>
              )}
              <th className="px-4 py-3 font-medium text-right">
                R{lastRound.roundNumber} cash
              </th>
              <th className="px-4 py-3 font-medium text-right">
                R{lastRound.roundNumber} throughput
              </th>
              {prevRound && (
                <th className="px-4 py-3 font-medium text-right">Δ throughput</th>
              )}
              <th className="px-4 py-3 font-medium">Bottleneck</th>
              <th className="px-4 py-3 font-medium">
                <Link href={`/trainer/sessions/${sessionId}/replay`}>
                  <span className="text-primary hover:underline cursor-pointer">Replay →</span>
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {teamsByRank.map((t, i) => {
              const prev = prevResults.find((r) => r.teamId === t.id);
              const last = lastResults.find((r) => r.teamId === t.id);
              const deltaThroughput =
                prev && last ? last.throughput - prev.throughput : null;
              const lastCash = last?.finalCash ?? 0;
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">
                    {i === 0 && "🥇"}
                    {i === 1 && "🥈"}
                    {i === 2 && "🥉"}
                    {i > 2 && i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                      style={{ background: t.color }}
                    />
                    <span className="font-medium">{t.name}</span>
                    <div className="text-xs text-muted-foreground">
                      {t.members.join(", ")}
                    </div>
                  </td>
                  {prevRound && (
                    <>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {prev ? `$${prev.finalCash.toLocaleString("en-US")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {prev ? prev.throughput.toLocaleString("en-US") : "—"}
                      </td>
                    </>
                  )}
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      lastCash < 0 ? "text-red-600" : "font-semibold"
                    }`}
                  >
                    ${lastCash.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {last?.throughput.toLocaleString("en-US") ?? "—"}
                  </td>
                  {prevRound && (
                    <td className="px-4 py-3 text-right font-mono">
                      {deltaThroughput == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : deltaThroughput > 0 ? (
                        <span className="text-green-700">+{deltaThroughput.toLocaleString("en-US")}</span>
                      ) : deltaThroughput < 0 ? (
                        <span className="text-red-600">{deltaThroughput.toLocaleString("en-US")}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {last?.bottleneckStationId ? (
                      <span className="text-amber-600 font-mono">{last.bottleneckStationId}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/trainer/sessions/${sessionId}/replay/${t.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Открыть →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Snapshots тренера */}
      {snapshots.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Snapshots ({snapshots.length})
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <ul className="divide-y divide-border">
              {snapshots.map((s) => (
                <li key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{s.label || "(без метки)"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Object.keys(s.state?.teams ?? {}).length || (s.state?.teams?.length ?? 0)} команд
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* MVP-2.C — Экспорт результатов */}
      <CertificatesAndExport sessionId={sessionId} hasFinishedRound={finishedRounds.length > 0} />

      <p className="text-sm text-muted-foreground">
        Reset round создаёт новый раунд для тех же команд — классическая
        ТОС-механика «играем → дебриф → играем снова».
      </p>
    </div>
  );
}

function CertificatesAndExport({
  sessionId,
  hasFinishedRound,
}: {
  sessionId: string;
  hasFinishedRound: boolean;
}) {
  const [certs, setCerts] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFinishedRound) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, hasFinishedRound]);

  async function load() {
    try {
      const data = await authJson<{ certificates: any[] }>(
        `/api/trainer/sessions/${sessionId}/certificates`,
      );
      setCerts(data.certificates);
    } catch (e: any) {
      // тихо, эта секция опциональна
    }
  }

  async function generate() {
    setBusy("generate");
    setError(null);
    try {
      const data = await authJson<{ generated: number; total: number; certificates: any[] }>(
        `/api/trainer/sessions/${sessionId}/certificates`,
        { method: "POST" },
      );
      setCerts(data.certificates);
      // Авто-скачивание PDF на КАЖДОГО участника (имя файла — ФИО)
      await downloadAll(data.certificates);
    } catch (e: any) {
      setError(
        String(e.message).includes("no_finished_round")
          ? "Сначала завершите хотя бы один раунд (кнопка Завершить или Reset round)"
          : e.message,
      );
    } finally {
      setBusy(null);
    }
  }

  async function downloadCsv() {
    setBusy("csv");
    try {
      const tok = getTrainerToken();
      const res = await fetch(`/api/trainer/sessions/${sessionId}/export.csv`, {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${sessionId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Ошибка экспорта: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadAll(list: any[]) {
    const tok = getTrainerToken();
    for (const c of list) {
      try {
        const res = await fetch(`/api/trainer/certificates/${c.id}/pdf`, {
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${String(c.memberFullName || "Сертификат").replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // небольшой стаггер — иначе браузер блокирует множественные загрузки
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        // пропускаем сбойный, продолжаем остальные
      }
    }
  }

  async function downloadCert(certId: string, fullName: string) {
    setBusy(certId);
    try {
      const tok = getTrainerToken();
      const res = await fetch(`/api/trainer/certificates/${certId}/pdf`, {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fullName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-lg font-semibold">Документы участников</h3>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={generate}
          disabled={!hasFinishedRound || busy === "generate"}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {busy === "generate"
            ? "Генерирую..."
            : certs.length > 0
              ? "↻ Перегенерировать сертификаты"
              : "🎓 Сгенерировать сертификаты"}
        </button>
        <button
          onClick={downloadCsv}
          disabled={busy === "csv"}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-elevate-1 disabled:opacity-50"
        >
          {busy === "csv" ? "Экспортирую..." : "📊 Скачать CSV"}
        </button>
      </div>

      {!hasFinishedRound && (
        <p className="text-xs text-muted-foreground">
          Сертификаты выдаются после завершения хотя бы одного раунда.
        </p>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {certs.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevate-1 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Участник</th>
                <th className="px-3 py-2 font-medium">Команда</th>
                <th className="px-3 py-2 font-medium">Награда</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2">{c.memberFullName}</td>
                  <td className="px-3 py-2">
                    {c.teamColor && (
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                        style={{ background: c.teamColor }}
                      />
                    )}
                    {c.teamName}
                  </td>
                  <td className="px-3 py-2">
                    {c.badge === "top1" && "🥇 1 место"}
                    {c.badge === "top2" && "🥈 2 место"}
                    {c.badge === "top3" && "🥉 3 место"}
                    {!c.badge && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => downloadCert(c.id, c.memberFullName)}
                      disabled={busy === c.id}
                      className="text-primary hover:underline text-xs disabled:opacity-50"
                    >
                      {busy === c.id ? "..." : "Скачать PDF →"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  session,
  configOverrides,
  onSavedConfig,
}: {
  session: SessionDTO;
  configOverrides: Record<string, any>;
  onSavedConfig: (next: Record<string, any>) => void;
}) {
  const [logoUrl, setLogoUrl] = useState<string>(configOverrides?.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState<string>(configOverrides?.primaryColor ?? "");
  const [orgName, setOrgName] = useState<string>(configOverrides?.orgName ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const body = {
        configOverrides: {
          logoUrl: logoUrl.trim() || null,
          primaryColor: primaryColor.trim() || null,
          orgName: orgName.trim() || null,
        },
      };
      const data = await authJson<{ session: any }>(
        `/api/trainer/sessions/${session.id}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      onSavedConfig(data.session.configOverrides ?? {});
      setMsg("Сохранено");
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setMsg(`Ошибка: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h3 className="text-lg font-semibold">Параметры сессии</h3>
        <Field label="ID сессии" value={session.id} mono />
        <Field label="Код доступа" value={session.accessCode} mono />
        <Field label="Сценарий" value={session.scenarioPreset} />
        <Field label="Макс. команд" value={String(session.maxTeams)} />
        <Field label="Стартовала" value={session.startedAt ? new Date(session.startedAt).toLocaleString("ru-RU") : "—"} />
        <Field label="Завершена" value={session.endedAt ? new Date(session.endedAt).toLocaleString("ru-RU") : "—"} />
        <Field label="Истекает" value={new Date(session.expiresAt).toLocaleString("ru-RU")} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">White-label (брендирование)</h3>
          <p className="text-sm text-muted-foreground">
            Логотип и цвет вашего корп-клиента появятся в lobby и игре участников.
            Если поля пустые — используется дефолтная палитра TessTOC.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL логотипа (PNG/SVG)</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Primary color (hex)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor || "#a8a25a"}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded border border-border"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#a8a25a"
                pattern="^#[0-9a-fA-F]{6}$"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Название организации</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="ООО Пример"
              maxLength={255}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {busy ? "..." : "Сохранить"}
          </button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1 border-b border-border last:border-b-0">
      <div className="text-sm text-muted-foreground col-span-1">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono text-sm" : "text-sm"}`}>{value}</div>
    </div>
  );
}

function ForcedEventsPanel({
  sessionId,
  teams,
}: {
  sessionId: string;
  teams: any[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function trigger(type: string, payload: Record<string, unknown>, durationMs: number) {
    setBusy(type);
    try {
      await authJson(`/api/trainer/sessions/${sessionId}/events`, {
        method: "POST",
        body: JSON.stringify({ type, payload, durationMs }),
      });
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  // Список машин и продуктов — динамически из gameConfig
  const machineIds = getAllMachineIds();
  const productIds = getAllProductIds();

  return (
    <div className="bg-card border border-border rounded-xl mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-elevate-1 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <div className="font-medium">События для всех команд</div>
            <div className="text-xs text-muted-foreground">
              Поломки, всплески спроса, повышение расходов — добавьте «вызов» в раунд
            </div>
          </div>
        </div>
        <span className="text-muted-foreground">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Поломка станка */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
              🔧 Поломка станка (на 60 секунд)
            </div>
            <div className="flex flex-wrap gap-2">
              {machineIds.map((mid) => (
                <button
                  key={mid}
                  disabled={busy !== null}
                  onClick={() => trigger("machine_breakdown", { machineId: mid }, 60000)}
                  className="px-3 py-1.5 rounded text-xs border border-border hover:bg-elevate-1 disabled:opacity-50"
                >
                  {getMachineLabel(mid)}
                </button>
              ))}
            </div>
          </div>

          {/* Спрос */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
              📈 Всплеск спроса x2 (на 90 сек)
            </div>
            <div className="flex flex-wrap gap-2">
              {productIds.map((pid) => (
                <button
                  key={`spike-${pid}`}
                  disabled={busy !== null}
                  onClick={() =>
                    trigger("demand_spike", { productId: pid, multiplier: 2 }, 90000)
                  }
                  className="px-3 py-1.5 rounded text-xs border border-border hover:bg-green-50 disabled:opacity-50"
                >
                  Продукт {pid}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
              📉 Падение спроса в 2 раза (на 90 сек)
            </div>
            <div className="flex flex-wrap gap-2">
              {productIds.map((pid) => (
                <button
                  key={`drop-${pid}`}
                  disabled={busy !== null}
                  onClick={() =>
                    trigger("demand_drop", { productId: pid, multiplier: 0.5 }, 90000)
                  }
                  className="px-3 py-1.5 rounded text-xs border border-border hover:bg-red-50 disabled:opacity-50"
                >
                  Продукт {pid}
                </button>
              ))}
            </div>
          </div>

          {/* Wage increase */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
              💸 Повышение постоянных расходов (на всю сессию)
            </div>
            <div className="flex gap-2">
              <button
                disabled={busy !== null}
                onClick={() => trigger("wage_increase", { percent: 20 }, 0)}
                className="px-3 py-1.5 rounded text-xs border border-border hover:bg-amber-50 disabled:opacity-50"
              >
                +20%
              </button>
              <button
                disabled={busy !== null}
                onClick={() => trigger("wage_increase", { percent: 50 }, 0)}
                className="px-3 py-1.5 rounded text-xs border border-border hover:bg-amber-50 disabled:opacity-50"
              >
                +50%
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            События применяются ко всем командам одновременно. Лог событий доступен в
            аналитике сессии.
          </p>
        </div>
      )}
    </div>
  );
}

// Tooltip-заголовок для ТОС-метрик в Live-таблице
function MetricHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 cursor-help"
      title={hint}
    >
      {label}
      <span className="text-muted-foreground text-xs">ⓘ</span>
    </span>
  );
}

