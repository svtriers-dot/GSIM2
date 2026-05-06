import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  teamJson,
  getDeviceToken,
  getTeamMeta,
  clearTeamSession,
} from "@/lib/auth";
import { TeamSocket } from "@/lib/teamSocket";
import Game from "@/pages/game";

interface MeResponse {
  team: { id: string; name: string; color: string; sessionId: string };
  members: { id: string; fullName: string }[];
  session: { name: string; accessCode: string; status: string } | null;
}

// MVP-1: оборачивает существующий компонент <Game />, добавляет overlay таймера
// и broadcast-сообщений от тренера. Действия игроков (place_machine и т.д.) пока
// синхронизируются in-memory — реальная связка с gameEngine для команды — MVP-2.
export default function PlaySessionGame() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [annotation, setAnnotation] = useState<{ stationId: string; text: string } | null>(null);
  const [broadcast, setBroadcast] = useState<{ message: string; ts: number } | null>(null);
  const meta = getTeamMeta();

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
        }
        if (data.session?.status === "ended" || data.session?.status === "archived") {
          navigate("/play/result");
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
    ws.on((event) => {
      if (event.type === "game.timer_event") {
        const status = event.payload?.status;
        if (status === "paused") setPaused(true);
        else if (status === "running") setPaused(false);
        else if (status === "ended" || status === "archived") {
          setEnded(true);
          setTimeout(() => navigate("/play/result"), 1200);
        } else if (status === "lobby") {
          navigate("/play/lobby");
        }
      } else if (event.type === "broadcast.received") {
        setBroadcast({ message: event.payload.message, ts: event.payload.timestamp });
      } else if (event.type === "annotation.received") {
        setAnnotation({ stationId: event.payload.stationId, text: event.payload.text });
        const dur = event.payload.durationMs || 10000;
        setTimeout(() => setAnnotation(null), dur);
      }
    });

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!me) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="relative min-h-screen">
      {/* Бейдж команды в левом верхнем углу */}
      <div className="fixed top-2 left-2 z-30 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm text-xs">
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ background: meta?.color || me.team.color }}
        />
        <span className="font-semibold">{me.team.name}</span>
        <span className="text-muted-foreground">
          {" "}
          · {me.members.length} участн.
        </span>
      </div>

      {/* Сама игра */}
      <Game />

      {/* Overlay паузы */}
      {paused && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-8 text-center max-w-md">
            <div className="text-5xl mb-3">⏸</div>
            <h2 className="text-xl font-semibold mb-2">Тренер поставил паузу</h2>
            <p className="text-sm text-muted-foreground">
              Игра возобновится, когда тренер продолжит сессию.
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

      {/* Annotation на станции */}
      {annotation && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <span className="font-mono mr-2">📍 {annotation.stationId}</span>
          <span>{annotation.text}</span>
        </div>
      )}
    </div>
  );
}
