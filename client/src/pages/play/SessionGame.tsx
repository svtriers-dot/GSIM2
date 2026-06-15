import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  teamJson,
  getDeviceToken,
  getTeamMeta,
  clearTeamSession,
} from "@/lib/auth";
import { TeamSocket, type TeamConnectionStatus } from "@/lib/teamSocket";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { MobileBlock } from "@/components/MobileBlock";
import Game, { type GameSessionMode } from "@/pages/game";
import type { GameSnapshot, SessionMetrics } from "@/lib/gameEngine";

interface MeResponse {
  team: {
    id: string;
    name: string;
    color: string;
    sessionId: string;
    factoryState?: Record<string, unknown>;
  };
  members: { id: string; fullName: string }[];
  session: {
    name: string;
    accessCode: string;
    status: string;
    scenarioPreset?: string;
    configOverrides?: {
      logoUrl?: string | null;
      primaryColor?: string | null;
      orgName?: string | null;
      startingCash?: number;
      fixedExpenses?: number;
      totalDays?: number;
      dayDurationSeconds?: number;
    };
  } | null;
}

export default function PlaySessionGame() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [paused, setPaused] = useState(true); // по умолчанию пауза до timer_event "running"
  const [ended, setEnded] = useState(false);
  const [annotation, setAnnotation] = useState<{ stationId: string; text: string } | null>(null);
  const [broadcast, setBroadcast] = useState<{ message: string; ts: number } | null>(null);
  const [restoreSnapshot, setRestoreSnapshot] = useState<GameSnapshot | null>(null);
  const [lastForcedEvent, setLastForcedEvent] = useState<{ type: string; payload: Record<string, unknown>; durationMs: number | null; triggeredAt: number } | null>(null);
  const [forcedToast, setForcedToast] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<TeamConnectionStatus>("disconnected");
  const meta = getTeamMeta();
  const wsRef = useRef<TeamSocket | null>(null);

  useEffect(() => {
    if (!getDeviceToken()) {
      navigate("/play/join");
      return;
    }

    teamJson<MeResponse>("/api/teams/me")
      .then((data) => {
        setMe(data);
        if (data.session?.status === "lobby" || data.session?.status === "draft") {
          navigate("/play/lobby");
          return;
        }
        if (data.session?.status === "ended" || data.session?.status === "archived") {
          navigate("/play/result");
          return;
        }
        if (data.session?.status === "running") setPaused(false);
        if (data.session?.status === "paused") setPaused(true);

        // Reconnect: восстанавливаем engine state из БД
        const fs = data.team.factoryState;
        if (fs && typeof fs === "object" && "snapshot" in fs) {
          setRestoreSnapshot((fs as any).snapshot as GameSnapshot);
        }
      })
      .catch((e) => {
        if (String(e.message).includes("404")) {
          clearTeamSession();
          navigate("/play/join");
        }
      });

    const ws = new TeamSocket();
    void ws.connect();
    ws.onStatus(setWsStatus);
    wsRef.current = ws;
    ws.on((event) => {
      if (event.type === "game.timer_event") {
        const status = event.payload?.status;
        if (status === "paused") setPaused(true);
        else if (status === "running") {
          setPaused(false);
          setEnded(false);
        } else if (status === "ended" || status === "archived") {
          setEnded(true);
          setTimeout(() => navigate("/play/result"), 1500);
        } else if (status === "lobby") {
          navigate("/play/lobby");
        }
      } else if (event.type === "broadcast.received") {
        setBroadcast({ message: event.payload.message, ts: event.payload.timestamp });
      } else if (event.type === "annotation.received") {
        setAnnotation({ stationId: event.payload.stationId, text: event.payload.text });
        const dur = event.payload.durationMs || 10000;
        setTimeout(() => setAnnotation(null), dur);
      } else if (event.type === "forced_event") {
        const ev = event.payload as any;
        setLastForcedEvent(ev);
        // Toast для участника
        const labels: Record<string, string> = {
          machine_breakdown: "🔧 Поломка станка",
          demand_spike: "📈 Всплеск спроса",
          demand_drop: "📉 Падение спроса",
          wage_increase: "💸 Повысились расходы",
        };
        const lbl = labels[ev.type] || ev.type;
        setForcedToast(lbl);
        setTimeout(() => setForcedToast(null), 5000);
      } else if (event.type === "game.state_sync") {
        // Сервер прислал текущий state команды (при первом подключении / reconnect)
        const fs = event.payload?.team?.factoryState;
        if (fs && typeof fs === "object" && "snapshot" in fs) {
          setRestoreSnapshot((fs as any).snapshot as GameSnapshot);
        }
      }
    });

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Стабильный sessionMode props (предотвращает лишние перезапуски useEffect в Game)
  const highlightedStationId = annotation?.stationId ?? null;
  const scenarioPreset = me?.session?.scenarioPreset;
  const constantsOverrides = useMemo(() => {
    const co = me?.session?.configOverrides ?? {};
    const out: Record<string, number> = {};
    if (typeof co.startingCash === "number") out.startingCash = co.startingCash;
    if (typeof co.fixedExpenses === "number") out.fixedExpenses = co.fixedExpenses;
    if (typeof co.totalDays === "number") out.totalDays = co.totalDays;
    if (typeof co.dayDurationSeconds === "number") out.dayDurationSeconds = co.dayDurationSeconds;
    return out;
  }, [me?.session?.configOverrides]);

  const sessionMode = useMemo<GameSessionMode>(
    () => ({
      isPaused: paused,
      isEnded: ended,
      restoreSnapshot,
      highlightedStationId,
      lastForcedEvent,
      scenarioPreset,
      constantsOverrides,
      onMetricsUpdate: (m: SessionMetrics) => {
        wsRef.current?.send("team:metrics", m as unknown as Record<string, unknown>);
      },
      onAction: (actionType, payload) => {
        wsRef.current?.send("team:action", { actionType, payload });
      },
      onGameEnd: (snapshot, metrics) => {
        wsRef.current?.send("team:game_over", { snapshot, metrics });
      },
    }),
    [paused, ended, restoreSnapshot, highlightedStationId, lastForcedEvent, scenarioPreset, constantsOverrides],
  );

  if (!me) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="relative min-h-screen">
      <ConnectionStatus status={wsStatus} />
      {/* Бейдж команды */}
      <div className="fixed top-2 left-[208px] z-30 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm text-xs">
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ background: meta?.color || me.team.color }}
        />
        <span className="font-semibold">{me.team.name}</span>
        <span className="text-muted-foreground"> · {me.members.length} участн.</span>
      </div>

      {/* White-label бренд (если задан) */}
      {me.session?.configOverrides?.logoUrl && (
        <div
          className="fixed top-2 right-2 z-30 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm text-xs flex items-center gap-2"
          style={{
            borderColor: me.session.configOverrides.primaryColor || undefined,
            borderWidth: 2,
          }}
        >
          <img
            src={me.session.configOverrides.logoUrl}
            alt="logo"
            style={{ height: 24, maxWidth: 100, objectFit: "contain" }}
          />
          {me.session.configOverrides.orgName && (
            <span className="font-medium">{me.session.configOverrides.orgName}</span>
          )}
        </div>
      )}

      {/* Игра в режиме сессии — на мобильных показываем блок */}
      <MobileBlock>
        <Game sessionMode={sessionMode} />
      </MobileBlock>

      {/* Overlay паузы */}
      {paused && !ended && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-8 text-center max-w-md">
            <div className="text-5xl mb-3">⏸</div>
            <h2 className="text-xl font-semibold mb-2">
              {me.session?.status === "lobby" ? "Ждём старта от тренера" : "Тренер поставил паузу"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Игра пойдёт, когда тренер запустит/возобновит сессию.
            </p>
          </div>
        </div>
      )}

      {/* Overlay завершения */}
      {ended && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-8 text-center max-w-md">
            <div className="text-5xl mb-3">🏁</div>
            <h2 className="text-xl font-semibold mb-2">Сессия завершена</h2>
            <p className="text-sm text-muted-foreground">Открываю результаты...</p>
          </div>
        </div>
      )}

      {/* Broadcast от тренера */}
      {broadcast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-white px-5 py-3 rounded-lg shadow-lg max-w-2xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">📢</span>
            <div className="flex-1">
              <div className="text-xs opacity-80 mb-0.5">Тренер</div>
              <div className="font-medium">{broadcast.message}</div>
            </div>
            <button onClick={() => setBroadcast(null)} className="text-sm underline">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Forced event toast */}
      {forcedToast && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-5 py-3 rounded-lg shadow-lg font-semibold">
          {forcedToast}
        </div>
      )}

      {/* Annotation подсветка станции */}
      {annotation && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <span className="font-mono mr-2">📍 {annotation.stationId}</span>
          <span>{annotation.text}</span>
        </div>
      )}
    </div>
  );
}
