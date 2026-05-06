import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  teamJson,
  getDeviceToken,
  getTeamMeta,
  clearTeamSession,
  teamFetch,
} from "@/lib/auth";
import { TeamSocket } from "@/lib/teamSocket";

interface MeResponse {
  team: { id: string; name: string; color: string; sessionId: string };
  members: { id: string; fullName: string }[];
  session: { name: string; accessCode: string; status: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Сессия ещё не открыта",
  lobby: "Ждём, когда тренер запустит",
  running: "Игра идёт!",
  paused: "Тренер поставил паузу",
  ended: "Сессия завершена",
  archived: "Сессия в архиве",
};

export default function PlayLobby() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([""]);
  const [broadcast, setBroadcast] = useState<{ message: string; ts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getDeviceToken()) {
      navigate("/play/join");
      return;
    }
    void load();

    const ws = new TeamSocket();
    ws.connect();
    const off = ws.on((event) => {
      if (event.type === "game.timer_event") {
        const status = event.payload?.status;
        if (status === "running") {
          navigate("/play/session");
        } else if (status === "ended" || status === "archived") {
          navigate("/play/result");
        } else {
          // Перечитываем
          void load();
        }
      } else if (event.type === "broadcast.received") {
        setBroadcast({ message: event.payload.message, ts: event.payload.timestamp });
      }
    });
    return () => {
      off();
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const data = await teamJson<MeResponse>("/api/teams/me");
      setMe(data);
      setDraft(data.members.map((m) => m.fullName));
      // Если уже идёт — сразу в игру
      if (data.session?.status === "running") navigate("/play/session");
      if (data.session?.status === "ended" || data.session?.status === "archived")
        navigate("/play/result");
    } catch (e: any) {
      if (String(e.message).includes("404") || String(e.message).includes("team_not_found")) {
        clearTeamSession();
        navigate("/play/join");
        return;
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveMembers() {
    const cleaned = draft.map((n) => n.trim()).filter((n) => n.length >= 2);
    if (cleaned.length === 0) {
      alert("Нужно хотя бы одно ФИО");
      return;
    }
    try {
      await teamFetch("/api/teams/members", {
        method: "POST",
        body: JSON.stringify({ members: cleaned.map((fullName) => ({ fullName })) }),
      });
      setEditing(false);
      await load();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  }

  async function leaveTeam() {
    if (!confirm("Выйти из команды? Подключение придётся делать заново.")) return;
    try {
      await teamFetch("/api/teams/leave", { method: "POST" });
    } catch {}
    clearTeamSession();
    navigate("/play/join");
  }

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;
  if (error || !me)
    return <div className="p-8 text-center text-red-600">{error || "Не удалось загрузить"}</div>;

  const status = me.session?.status || "draft";
  const canEdit = status === "lobby" || status === "draft";

  return (
    <div className="min-h-screen bg-background">
      {broadcast && (
        <div className="bg-amber-500 text-white px-4 py-3 text-center font-medium">
          📢 Тренер: {broadcast.message}
          <button onClick={() => setBroadcast(null)} className="ml-3 text-sm underline">
            закрыть
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div
          className="bg-card border border-border rounded-xl p-6 mb-4"
          style={{ borderTopColor: me.team.color, borderTopWidth: 6 }}
        >
          <div className="text-xs text-muted-foreground mb-1">Ваша команда</div>
          <div className="text-2xl font-bold">{me.team.name}</div>
          {me.session && (
            <div className="text-sm text-muted-foreground mt-1">
              Мастер-класс: {me.session.name} · код {me.session.accessCode}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mb-4 text-center">
          <div className="text-3xl mb-2">
            {status === "lobby" && "⏳"}
            {status === "running" && "▶️"}
            {status === "paused" && "⏸"}
            {status === "ended" && "✅"}
          </div>
          <div className="text-lg font-medium">{STATUS_LABELS[status]}</div>
          {status === "lobby" && (
            <p className="text-sm text-muted-foreground mt-2">
              Игра начнётся, когда тренер нажмёт «Старт». Вы услышите/увидите.
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Кто играет</h3>
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-primary hover:underline"
              >
                Изменить
              </button>
            )}
          </div>

          {!editing ? (
            <ul className="space-y-1">
              {me.members.map((m, i) => (
                <li key={m.id} className="text-sm">
                  {i + 1}. {m.fullName}
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {draft.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-7 py-2 text-center text-sm text-muted-foreground">
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    value={n}
                    onChange={(e) =>
                      setDraft((d) => d.map((x, idx) => (idx === i ? e.target.value : x)))
                    }
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="ФИО"
                  />
                  {draft.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}
                      className="px-2 text-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {draft.length < 10 && (
                <button
                  type="button"
                  onClick={() => setDraft((d) => [...d, ""])}
                  className="text-sm text-primary hover:underline"
                >
                  + добавить
                </button>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveMembers}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft(me.members.map((m) => m.fullName));
                  }}
                  className="px-4 py-2 rounded-lg border border-border text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <button
            onClick={leaveTeam}
            className="mt-6 text-sm text-red-600 hover:underline mx-auto block"
          >
            Выйти из команды
          </button>
        )}
      </div>
    </div>
  );
}
