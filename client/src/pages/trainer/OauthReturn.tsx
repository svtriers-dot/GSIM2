import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { setTrainerToken, authJson } from "@/lib/auth";

// Страница, на которую редиректит /api/trainer/auth/yandex/callback
// Получает ?token=... в query, сохраняет в localStorage, редиректит по роли.
export default function TrainerOauthReturn() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (!token) {
      setError("Не получен токен от OAuth");
      return;
    }
    // Сохраняем токен с минимальным профилем (роль уточним через /auth/me)
    setTrainerToken(token, { id: "", email: "", name: "" });
    authJson<{ trainer: any; token?: string }>("/api/trainer/auth/me")
      .then((data) => {
        if (data.token) setTrainerToken(data.token, data.trainer);
        else setTrainerToken(token, data.trainer);
        const role = data.trainer.role;
        if (role === "active" || role === "super_admin") navigate("/trainer");
        else if (role === "pending" || role === "suspended") navigate("/trainer/pending");
        else navigate("/trainer/login");
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-xl p-8 text-center max-w-md">
        {error ? (
          <>
            <div className="text-red-600 mb-4">Ошибка OAuth: {error}</div>
            <a href="/trainer/login" className="text-primary hover:underline">
              ← Вернуться к входу
            </a>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Авторизация Yandex...</div>
        )}
      </div>
    </div>
  );
}
