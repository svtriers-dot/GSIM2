import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { setDeviceToken, getDeviceToken } from "@/lib/auth";

interface MemberRow {
  fullName: string;
}

export default function PlayJoin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"code" | "team">("code");
  const [code, setCode] = useState("");
  const [sessionInfo, setSessionInfo] = useState<{ name: string; status: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([{ fullName: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Если уже подключены — сразу в lobby
    if (getDeviceToken()) {
      navigate("/play/lobby");
    }
    // Авто-fill кода из URL: /play/join?code=ABC123
    const q = new URLSearchParams(location.search);
    const c = q.get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  function addMember() {
    setMembers((m) => [...m, { fullName: "" }]);
  }
  function removeMember(i: number) {
    setMembers((m) => m.filter((_, idx) => idx !== i));
  }
  function updateMember(i: number, val: string) {
    setMembers((m) => m.map((row, idx) => (idx === i ? { fullName: val } : row)));
  }

  async function checkCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const res = await fetch(`/api/teams/check?code=${encodeURIComponent(code.toUpperCase())}`);
      const data = await res.json();
      if (!data.exists) {
        throw new Error("Сессия с таким кодом не найдена или уже завершена");
      }
      if (data.status !== "lobby" && data.status !== "draft") {
        throw new Error(
          data.status === "running"
            ? "Сессия уже идёт — присоединение закрыто. Обратитесь к тренеру."
            : `Сессия не принимает участников (статус: ${data.status})`,
        );
      }
      setSessionInfo({ name: data.name, status: data.status });
      setStep("team");
    } catch (e: any) {
      setError(e.message || "Не удалось проверить код");
    } finally {
      setChecking(false);
    }
  }

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cleanMembers = members
        .map((m) => ({ fullName: m.fullName.trim() }))
        .filter((m) => m.fullName.length >= 2);
      if (cleanMembers.length === 0) {
        throw new Error("Добавьте хотя бы одно ФИО");
      }
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          teamName: teamName.trim(),
          members: cleanMembers,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data.error === "session_not_found"
            ? "Сессия с таким кодом не найдена или уже завершена"
            : data.error === "session_full"
              ? "Сессия заполнена — обратитесь к тренеру"
              : data.error === "invalid_pin"
                ? "Неверный PIN"
                : data.error === "team_name_taken"
                  ? "Такое название команды уже занято — выберите другое"
                  : data.error === "session_not_accepting"
                    ? `Сессия не принимает участников (статус: ${data.currentStatus})`
                    : data.error === "validation"
                      ? "Проверьте данные: код 6 знаков, ФИО ≥ 2 символов"
                      : `Ошибка: ${data.error || res.statusText}`;
        throw new Error(msg);
      }
      const data = await res.json();
      setDeviceToken(data.team.deviceToken, {
        id: data.team.id,
        name: data.team.name,
        color: data.team.color,
        sessionId: data.team.sessionId,
      });
      navigate("/play/lobby");
    } catch (e: any) {
      setError(e.message || "Не удалось подключиться");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">TessTOC · Мастер-класс</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Подключение по коду от тренера
        </p>

        {step === "code" && (
          <form onSubmit={checkCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Код сессии (6 знаков)</label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest rounded-lg border border-border bg-background"
                placeholder="ABC123"
              />
            </div>
{error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={code.length !== 6 || checking}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {checking ? "Проверяю..." : "Дальше →"}
            </button>
          </form>
        )}

        {step === "team" && (
          <form onSubmit={joinTeam} className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("code")}
              className="text-sm text-muted-foreground hover:underline"
            >
              ← Изменить код ({code})
            </button>
            {sessionInfo && (
              <div className="bg-elevate-1 border border-border rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Мастер-класс:</span>{" "}
                <span className="font-medium">{sessionInfo.name}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Название команды</label>
              <input
                type="text"
                required
                minLength={1}
                maxLength={100}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                placeholder="Зелёные орлы"
              />
            </div>

<div>
              <label className="block text-sm font-medium mb-1">
                Кто играет (ФИО для сертификатов)
              </label>
              <div className="space-y-2">
                {members.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-7 py-2 text-center text-sm text-muted-foreground">
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      value={m.fullName}
                      onChange={(e) => updateMember(i, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="Иванов Иван Иванович"
                    />
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(i)}
                        className="px-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {members.length < 10 && (
                <button
                  type="button"
                  onClick={addMember}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  + добавить ещё
                </button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                За одним компьютером — одна команда. Все, кто играет, получат именные
                сертификаты.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {loading ? "..." : "Подключиться к мастер-классу"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
