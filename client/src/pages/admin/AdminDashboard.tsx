import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  authJson,
  getTrainerToken,
  getTrainerProfile,
  logoutTrainer,
} from "@/lib/auth";

interface DashboardData {
  trainers: {
    pending: number;
    active: number;
    suspended: number;
    rejected: number;
    super_admin: number;
  };
  sessions: Record<string, number>;
  totalTeams: number;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profile = getTrainerProfile();

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    void load();
  }, []);

  async function load() {
    try {
      const d = await authJson<DashboardData>("/api/admin/dashboard");
      setData(d);
    } catch (e: any) {
      if (String(e.message).startsWith("403")) {
        setError("Доступ только для super_admin");
      } else if (String(e.message).startsWith("401")) {
        logoutTrainer();
        navigate("/trainer/login");
      } else {
        setError(e.message);
      }
    }
  }

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href="/trainer" className="text-primary hover:underline">
            ← Кабинет тренера
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">🛡 Админка TessTOC</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.name} · {profile?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/trainers"
              className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
            >
              Тренеры
            </Link>
            <Link
              href="/admin/sessions"
              className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
            >
              Сессии
            </Link>
            <Link
              href="/trainer"
              className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
            >
              К моим сессиям
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Тренеры */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Тренеры</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card
              label="На рассмотрении"
              value={data?.trainers.pending ?? 0}
              accent="amber"
              link="/admin/trainers?role=pending"
            />
            <Card
              label="Активные"
              value={data?.trainers.active ?? 0}
              accent="green"
              link="/admin/trainers?role=active"
            />
            <Card
              label="Заблокированы"
              value={data?.trainers.suspended ?? 0}
              accent="gray"
              link="/admin/trainers?role=suspended"
            />
            <Card
              label="Отклонены"
              value={data?.trainers.rejected ?? 0}
              accent="red"
              link="/admin/trainers?role=rejected"
            />
            <Card
              label="Super admin"
              value={data?.trainers.super_admin ?? 0}
              accent="purple"
              link="/admin/trainers?role=super_admin"
            />
          </div>
        </section>

        {/* Сессии */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Сессии</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card label="Lobby" value={data?.sessions.lobby ?? 0} accent="blue" />
            <Card label="Идёт" value={data?.sessions.running ?? 0} accent="green" />
            <Card label="Пауза" value={data?.sessions.paused ?? 0} accent="amber" />
            <Card label="Завершены" value={data?.sessions.ended ?? 0} accent="gray" />
            <Card label="Команд всего" value={data?.totalTeams ?? 0} accent="indigo" />
          </div>
        </section>

        {data?.trainers.pending && data.trainers.pending > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm">
              <strong>{data.trainers.pending}</strong> заявок ждут вашего рассмотрения.{" "}
              <Link
                href="/admin/trainers?role=pending"
                className="text-primary hover:underline font-medium"
              >
                Перейти к списку →
              </Link>
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
  link,
}: {
  label: string;
  value: number;
  accent: string;
  link?: string;
}) {
  const colors: Record<string, string> = {
    amber: "border-amber-300 bg-amber-50",
    green: "border-green-300 bg-green-50",
    gray: "border-gray-300 bg-gray-50",
    red: "border-red-300 bg-red-50",
    purple: "border-purple-300 bg-purple-50",
    blue: "border-blue-300 bg-blue-50",
    indigo: "border-indigo-300 bg-indigo-50",
  };
  const cls = colors[accent] || "border-border bg-card";
  const inner = (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
  if (link)
    return (
      <Link href={link} className="block hover:opacity-90">
        {inner}
      </Link>
    );
  return inner;
}
