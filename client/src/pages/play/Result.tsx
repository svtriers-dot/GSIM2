import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { teamJson, getDeviceToken, getTeamMeta, clearTeamSession } from "@/lib/auth";

interface MeResponse {
  team: { id: string; name: string; color: string; sessionId: string };
  members: { id: string; fullName: string }[];
  session: { name: string; accessCode: string; status: string } | null;
}

export default function PlayResult() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getDeviceToken()) {
      navigate("/play/join");
      return;
    }
    teamJson<MeResponse>("/api/teams/me")
      .then(setMe)
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => {
            clearTeamSession();
            navigate("/play/join");
          }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
        >
          Вернуться к подключению
        </button>
      </div>
    );

  if (!me) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-card border border-border rounded-xl p-8 text-center">
        <div className="text-5xl mb-3">🏁</div>
        <h1 className="text-2xl font-semibold mb-1">Сессия завершена</h1>
        {me.session && (
          <p className="text-sm text-muted-foreground mb-6">{me.session.name}</p>
        )}

        <div
          className="bg-elevate-1 border border-border rounded-lg p-4 mb-6"
          style={{ borderTopColor: me.team.color, borderTopWidth: 4 }}
        >
          <div className="text-xs text-muted-foreground mb-1">Ваша команда</div>
          <div className="text-lg font-bold">{me.team.name}</div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Состав</h3>
          <ul className="text-sm space-y-1">
            {me.members.map((m, i) => (
              <li key={m.id}>
                {i + 1}. {m.fullName}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Подробный leaderboard и сертификаты — у тренера. Тренер выдаст PDF-сертификаты
          на каждое имя из списка (в MVP-2).
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              clearTeamSession();
              navigate("/");
            }}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            ← На главную
          </button>
        </div>
      </div>
    </div>
  );
}
