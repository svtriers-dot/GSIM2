import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authJson, getTrainerToken, logoutTrainer, getTrainerProfile, setTrainerToken } from "@/lib/auth";

interface MeResponse {
  trainer: {
    id: string;
    email: string;
    name: string;
    organization: string | null;
    role: string;
    createdAt: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Заявка на рассмотрении",
  rejected: "Заявка отклонена",
  suspended: "Учётная запись приостановлена",
};

export default function TrainerPending() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse["trainer"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    void poll();
    const id = setInterval(poll, 30000); // авто-обновление каждые 30с
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function poll() {
    try {
      const data = await authJson<MeResponse & { token?: string }>("/api/trainer/auth/me");
      setMe(data.trainer);
      // /auth/me возвращает свежий token — обновим localStorage
      if (data.token) {
        setTrainerToken(data.token, data.trainer as any);
      }
      // pending → онбординг с чек-листом
      if (data.trainer.role === "pending") {
        navigate("/trainer/onboarding");
        return;
      }
      // active или super_admin — в кабинет
      if (data.trainer.role === "active" || data.trainer.role === "super_admin") {
        navigate("/trainer");
      }
    } catch (e: any) {
      if (String(e.message).startsWith("401") || String(e.message).startsWith("403")) {
        setError(e.message);
      }
    }
  }

  function logout() {
    logoutTrainer();
    navigate("/trainer/login");
  }

  if (!me)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Загрузка...</div>
      </div>
    );

  const role = me.role;
  const isPending = role === "pending";
  const isRejected = role === "rejected";
  const isSuspended = role === "suspended";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm text-center">
        <div className="text-5xl mb-3">
          {isPending && "⏳"}
          {isRejected && "❌"}
          {isSuspended && "⛔"}
        </div>
        <h1 className="text-xl font-semibold mb-2">{STATUS_LABELS[role] || role}</h1>

        <div className="text-sm text-muted-foreground space-y-1 mb-6">
          <div>Тренер: <span className="font-medium text-foreground">{me.name}</span></div>
          <div>Email: {me.email}</div>
          {me.organization && <div>Организация: {me.organization}</div>}
        </div>

        {isPending && (
          <p className="text-sm text-muted-foreground mb-6">
            Ваша заявка передана администратору. Как только её одобрят, вы сможете создавать
            мастер-классы. Эта страница автоматически обновляется каждые 30 секунд.
          </p>
        )}
        {isRejected && (
          <p className="text-sm text-muted-foreground mb-6">
            Администратор отклонил вашу заявку. Если считаете, что это ошибка — свяжитесь с
            тренером, который вас приглашал, или с администратором продукта.
          </p>
        )}
        {isSuspended && (
          <p className="text-sm text-muted-foreground mb-6">
            Доступ к кабинету временно приостановлен. По вопросам обратитесь к администратору.
          </p>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
