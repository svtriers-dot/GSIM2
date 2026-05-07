import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { authFetch, authJson, getTrainerToken } from "@/lib/auth";
import { confirmDialog, confirmAction } from "@/components/ConfirmDialog";
import { SkeletonTable, ErrorRetry } from "@/components/Skeleton";
import { useToast } from "@/hooks/use-toast";

interface TrainerRow {
  id: string;
  email: string;
  name: string;
  organization: string | null;
  role: "pending" | "active" | "suspended" | "rejected" | "super_admin";
  approvedAt: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
  quizPassedAt?: string | null;
  quizScore?: number | null;
  practicePlayedAt?: string | null;
  practiceFinalCash?: number | null;
  isCertified?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  pending: "На рассмотрении",
  active: "Активен",
  suspended: "Заблокирован",
  rejected: "Отклонён",
  super_admin: "Super admin",
};

const ROLE_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-gray-200 text-gray-700",
  rejected: "bg-red-100 text-red-800",
  super_admin: "bg-purple-100 text-purple-800",
};

export default function AdminTrainers() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [rows, setRows] = useState<TrainerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const limit = 100;

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    // Прочитать ?role=pending из URL
    const q = new URLSearchParams(location.search);
    const r = q.get("role");
    if (r) setFilterRole(r);
    void load(r || "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(role: string, searchQ: string, off = 0) {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/trainers", location.origin);
      if (role) url.searchParams.set("role", role);
      if (searchQ) url.searchParams.set("search", searchQ);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(off));
      const data = await authJson<{ trainers: TrainerRow[]; total: number }>(
        url.pathname + url.search,
      );
      setRows(data.trainers);
      setTotal(data.total ?? data.trainers.length);
      setOffset(off);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function setPassword(trainerId: string, name: string) {
    const r = await confirmDialog({
      title: `Сбросить пароль для ${name}`,
      description: "Минимум 8 символов. Старый пароль перестанет работать.",
      promptLabel: "Новый пароль",
      promptPlaceholder: "Минимум 8 символов",
      promptType: "password",
      confirmLabel: "Сбросить",
      destructive: true,
    });
    if (!r.confirmed || !r.promptValue) return;
    if (r.promptValue.length < 8) {
      toast({ title: "Пароль слишком короткий", description: "Минимум 8 символов", variant: "destructive" });
      return;
    }
    setBusy(trainerId);
    try {
      const res = await authFetch(`/api/admin/trainers/${trainerId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: r.promptValue }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      toast({ title: "Пароль обновлён", description: name });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function action(
    trainerId: string,
    op: "approve" | "reject" | "suspend" | "reactivate",
  ) {
    let notes: string | undefined = undefined;
    const labels: Record<typeof op, { title: string; confirmLabel: string; destructive: boolean }> = {
      approve: { title: "Одобрить заявку?", confirmLabel: "Одобрить", destructive: false },
      reject: { title: "Отклонить заявку?", confirmLabel: "Отклонить", destructive: true },
      suspend: { title: "Заблокировать тренера?", confirmLabel: "Заблокировать", destructive: true },
      reactivate: { title: "Восстановить тренера?", confirmLabel: "Восстановить", destructive: false },
    };
    const cfg = labels[op];
    const r = await confirmDialog({
      title: cfg.title,
      description: op === "reject" || op === "suspend"
        ? "Тренер не сможет создавать сессии. Можно указать причину — будет видна в audit-log."
        : undefined,
      confirmLabel: cfg.confirmLabel,
      destructive: cfg.destructive,
      promptLabel: op === "reject" || op === "suspend" ? "Причина" : undefined,
      promptOptional: true,
    });
    if (!r.confirmed) return;
    notes = r.promptValue || undefined;

    setBusy(trainerId);
    try {
      const res = await authFetch(`/api/admin/trainers/${trainerId}/${op}`, {
        method: "POST",
        body: JSON.stringify(notes ? { notes } : {}),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      toast({ title: cfg.title.replace("?", ""), description: notes });
      await load(filterRole, search);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← Админка
          </Link>
          <h1 className="text-xl font-semibold mt-2">Тренеры</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              void load(e.target.value, search);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Все роли</option>
            <option value="pending">На рассмотрении</option>
            <option value="active">Активные</option>
            <option value="suspended">Заблокированы</option>
            <option value="rejected">Отклонены</option>
            <option value="super_admin">Super admin</option>
          </select>
          <input
            type="text"
            placeholder="Поиск по email / имени / организации..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(filterRole, search);
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
          <button
            onClick={() => load(filterRole, search)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Найти
          </button>
        </div>

        {loading && <SkeletonTable rows={5} cols={6} />}
        {error && (
          <ErrorRetry message={error} onRetry={() => void load(filterRole, search, offset)} />
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
            Нет тренеров с такими параметрами.
          </div>
        )}

        {!loading && rows.length > 0 && total > limit && (
          <div className="flex items-center justify-between mt-4 mb-3 text-sm">
            <span className="text-muted-foreground">
              Записи {offset + 1}–{Math.min(offset + limit, total)} из {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => load(filterRole, search, Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
              >
                ← Назад
              </button>
              <button
                onClick={() => load(filterRole, search, offset + limit)}
                disabled={offset + limit >= total || loading}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
              >
                Вперёд →
              </button>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-3">
              {rows.map((t) => (
                <div key={t.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/trainers/${t.id}`} className="font-medium hover:underline block truncate">
                        {t.name}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                      {t.organization && <div className="text-xs text-muted-foreground truncate">{t.organization}</div>}
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs whitespace-nowrap ${ROLE_COLORS[t.role] || ""}`}>
                      {ROLE_LABELS[t.role]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {new Date(t.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                  <ActionButtons
                    trainer={t}
                    busy={busy === t.id}
                    onAction={(op) => action(t.id, op)}
                    onResetPassword={() => setPassword(t.id, t.name)}
                  />
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-elevate-1 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Тренер</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Организация</th>
                  <th className="px-4 py-3 font-medium">Роль</th>
                  <th className="px-4 py-3 font-medium">Регистрация</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-elevate-1">
                    <td className="px-4 py-3">
                      <Link href={`/admin/trainers/${t.id}`} className="font-medium hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div>{t.email}</div>
                      <div className="text-xs mt-0.5 space-x-1">
                        {t.practicePlayedAt && (
                          <span title={`Practice ${t.practiceFinalCash?.toLocaleString("ru-RU")} ₽`}>🎮</span>
                        )}
                        {t.quizPassedAt && (
                          <span title={`Quiz ${t.quizScore}/7`}>📚</span>
                        )}
                        {t.isCertified && <span title="Certified">🎓</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.organization || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${ROLE_COLORS[t.role] || ""}`}
                      >
                        {ROLE_LABELS[t.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(t.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionButtons trainer={t} busy={busy === t.id} onAction={(op) => action(t.id, op)} onResetPassword={() => setPassword(t.id, t.name)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ActionButtons({
  trainer,
  busy,
  onAction,
  onResetPassword,
}: {
  trainer: TrainerRow;
  busy: boolean;
  onAction: (op: "approve" | "reject" | "suspend" | "reactivate") => void;
  onResetPassword: () => void;
}) {
  const role = trainer.role;
  if (role === "super_admin") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex gap-1 justify-end items-center">
      {role !== "rejected" && (
        <button
          disabled={busy}
          onClick={onResetPassword}
          className="px-2 py-1 rounded text-xs hover:bg-elevate-1 border border-border disabled:opacity-50"
          title="Сбросить пароль"
        >
          🔑
        </button>
      )}
      {role === "pending" && (
        <>
          <button
            disabled={busy}
            onClick={() => onAction("approve")}
            className="px-2 py-1 rounded bg-green-600 text-white text-xs disabled:opacity-50"
          >
            ✓ Approve
          </button>
          <button
            disabled={busy}
            onClick={() => onAction("reject")}
            className="px-2 py-1 rounded bg-red-600 text-white text-xs disabled:opacity-50"
          >
            ✕ Reject
          </button>
        </>
      )}
      {role === "active" && (
        <button
          disabled={busy}
          onClick={() => onAction("suspend")}
          className="px-2 py-1 rounded bg-amber-500 text-white text-xs disabled:opacity-50"
        >
          ⏸ Suspend
        </button>
      )}
      {role === "suspended" && (
        <button
          disabled={busy}
          onClick={() => onAction("reactivate")}
          className="px-2 py-1 rounded bg-green-600 text-white text-xs disabled:opacity-50"
        >
          ↻ Reactivate
        </button>
      )}
      {role === "rejected" && <span className="text-xs text-muted-foreground italic">отклонён</span>}
    </div>
  );
}
