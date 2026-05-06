import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { authJson, getTrainerToken } from "@/lib/auth";
import { TrainerSocket, type SessionLiveState } from "@/lib/trainerSocket";

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
  const [busy, setBusy] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const socketRef = useRef<TrainerSocket | null>(null);

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    if (!sessionId) return;
    void loadInitial();
    const ws = new TrainerSocket(sessionId);
    ws.connect();
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
      alert(`Ошибка: ${e.message}`);
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
      alert(`Ошибка broadcast: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function snapshot() {
    const label = prompt("Метка для snapshot (что сейчас на экране?):");
    if (!label) return;
    setBusy("snapshot");
    try {
      await authJson(`/api/trainer/sessions/${sessionId}/snapshot`, {
        method: "POST",
        body: JSON.stringify({ label }),
      });
    } catch (e: any) {
      alert(`Ошибка snapshot: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function kick(teamId: string, teamName: string) {
    if (!confirm(`Удалить команду «${teamName}»? Их подключение будет разорвано.`)) return;
    setBusy("kick");
    try {
      await authJson(`/api/trainer/sessions/${sessionId}/kick`, {
        method: "POST",
        body: JSON.stringify({ teamId }),
      });
      await refreshSession();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
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

        {/* Контент таб */}
        {tab === "lobby" && (
          <LobbyTab session={session} teams={teamsForUI as any} onKick={kick} />
        )}
        {tab === "live" && <LiveTab teams={liveTeams.length ? liveTeams : (teams as any)} />}
        {tab === "debrief" && <DebriefTab teams={teamsForUI as any} />}
        {tab === "settings" && <SettingsTab session={session} />}
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
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-elevate-1 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Команда</th>
            <th className="px-4 py-3 font-medium text-right">Cash $</th>
            <th className="px-4 py-3 font-medium text-right">Throughput</th>
            <th className="px-4 py-3 font-medium text-right">WIP / Inv</th>
            <th className="px-4 py-3 font-medium text-right">OE</th>
            <th className="px-4 py-3 font-medium">Bottleneck</th>
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
                <td
                  className={`px-4 py-3 text-right font-mono ${cash < 0 ? "text-red-600" : ""}`}
                >
                  ${cash.toLocaleString("en-US")}
                </td>
                <td className="px-4 py-3 text-right font-mono">{m.throughput ?? 0}</td>
                <td className="px-4 py-3 text-right font-mono">{m.inventory ?? 0}</td>
                <td className="px-4 py-3 text-right font-mono">
                  ${(m.operatingExpense ?? 0).toLocaleString("en-US")}
                </td>
                <td className="px-4 py-3">
                  {m.bottleneckStationId ? (
                    <span className="text-amber-600">⚠ {m.bottleneckStationId}</span>
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
  );
}

function DebriefTab({ teams }: { teams: any[] }) {
  // По final_cash сортируем (если есть metrics.cash)
  const sorted = [...teams].sort((a, b) => (b.metrics?.cash ?? 0) - (a.metrics?.cash ?? 0));
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Leaderboard последнего раунда</h3>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-elevate-1 text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-12">#</th>
              <th className="px-4 py-3 font-medium">Команда</th>
              <th className="px-4 py-3 font-medium text-right">Cash $</th>
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
                <td className="px-4 py-3 text-right font-mono">
                  ${(t.metrics?.cash ?? 0).toLocaleString("en-US")}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {(t.members || []).map((m: any) => m.fullName).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        После завершения сессии — нажмите «Завершить» в верхней панели, чтобы зафиксировать
        результаты раунда. Reset round создаст новый раунд на тех же командах для повторного
        прогона (классическая Goldratt-схема: «играем → дебриф → играем снова»).
      </p>
    </div>
  );
}

function SettingsTab({ session }: { session: SessionDTO }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-3">
      <h3 className="text-lg font-semibold">Настройки сессии</h3>
      <Field label="ID сессии" value={session.id} mono />
      <Field label="Код доступа" value={session.accessCode} mono />
      <Field label="Сценарий" value={session.scenarioPreset} />
      <Field label="Макс. команд" value={String(session.maxTeams)} />
      <Field label="Стартовала" value={session.startedAt ? new Date(session.startedAt).toLocaleString("ru-RU") : "—"} />
      <Field label="Завершена" value={session.endedAt ? new Date(session.endedAt).toLocaleString("ru-RU") : "—"} />
      <Field label="Истекает" value={new Date(session.expiresAt).toLocaleString("ru-RU")} />
      <p className="text-xs text-muted-foreground pt-2">
        White-label, кастомный конфиг сценария, PDF-сертификаты — в MVP-2.
      </p>
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
