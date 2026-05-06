import { useState } from "react";
import { useLocation } from "wouter";
import { setTrainerToken } from "@/lib/auth";

type Mode = "login" | "register";

export default function TrainerLogin() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/trainer/auth/login" : "/api/trainer/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, name, organization: organization || undefined };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error === "trainer_exists"
            ? "Тренер с таким email уже зарегистрирован"
            : data.error === "invalid_credentials"
              ? "Неверный email или пароль"
              : data.error === "rejected"
                ? "Заявка отклонена администратором. Доступ невозможен."
                : data.error === "validation"
                  ? "Некорректные данные. Email — валидный, пароль ≥ 8 символов"
                  : `Ошибка: ${data.error || res.statusText}`,
        );
      }
      const data = await res.json();
      setTrainerToken(data.token, data.trainer);
      const role = data.trainer?.role;
      if (role === "pending") {
        navigate("/trainer/onboarding");
      } else if (role === "suspended") {
        navigate("/trainer/pending");
      } else if (role === "rejected") {
        // не должно случиться (login отбит на 403), но fallback
        navigate("/trainer/login");
      } else {
        navigate("/trainer");
      }
    } catch (e: any) {
      setError(e.message || "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <a href="/" className="text-sm text-muted-foreground hover:underline mb-3 inline-block">
          ← На главную
        </a>
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-1">TessTOC · Тренер</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login" ? "Вход в кабинет тренера" : "Регистрация тренера"}
        </p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              mode === "login"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent border-border"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              mode === "register"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent border-border"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">ФИО</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Организация (опционально)
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Название компании"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          После входа вы сможете создавать мастер-классы и контролировать сессии. Подробнее
          — на{" "}
          <a href="/about" className="underline">
            странице о продукте
          </a>
          .
        </p>
        </div>
      </div>
    </div>
  );
}
