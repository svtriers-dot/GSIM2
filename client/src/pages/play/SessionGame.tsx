import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  teamJson,
  getDeviceToken,
  getTeamMeta,
  clearTeamSession,
} from "@/lib/auth";
import { TeamSocket } from "@/lib/teamSocket";
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
    configOverrides?: { logoUrl?: string | null; primaryColor?: string | null; orgName?: string | null };
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
    ws.connect();
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
  const sessionMode = useMemo<GameSessionMode>(
    () => ({
      isPaused: paused,
      isEnded: ended,
      restoreSnapshot,
      highlightedStationId,
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
    [paused, ended, restoreSnapshot, highlightedStationId],
  );

  if (!me) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="relative min-h-screen">
      {/* Бейдж команды */}
      <div className="fixed top-2 left-2 z-30 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm text-xs">
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

      {/* Игра в режиме сессии */}
      <Game sessionMode={sessionMode} />

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
