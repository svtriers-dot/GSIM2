import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { authJson, getTrainerToken } from "@/lib/auth";

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

const ACTION_LABELS: Record<string, string> = {
  trainer_approved: "✓ Approved тренера",
  trainer_rejected: "✕ Rejected тренера",
  trainer_suspended: "⏸ Suspended тренера",
  trainer_reactivated: "↻ Reactivated тренера",
  trainer_password_reset: "🔑 Reset password",
  super_admin_login: "🔓 Super_admin login",
  super_admin_logout: "🔐 Super_admin logout",
};

const ACTION_COLORS: Record<string, string> = {
  trainer_approved: "bg-green-100 text-green-800",
  trainer_rejected: "bg-red-100 text-red-800",
  trainer_suspended: "bg-amber-100 text-amber-800",
  trainer_reactivated: "bg-green-100 text-green-800",
  trainer_password_reset: "bg-purple-100 text-purple-800",
  super_admin_login: "bg-blue-100 text-blue-800",
  super_admin_logout: "bg-gray-100 text-gray-700",
};

export default function AdminAuditLog() {
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const limit = 100;

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    void load(filterAction, 0);
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction]);

  async function load(action: string, off: number) {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/audit-log", location.origin);
      if (action) url.searchParams.set("action", action);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(off));
      const data = await authJson<{ rows: AuditEntry[]; total: number }>(
        url.pathname + url.search,
      );
      setRows(data.rows);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function nextPage() {
    const newOffset = offset + limit;
    if (newOffset < total) {
      setOffset(newOffset);
      void load(filterAction, newOffset);
    }
  }

  function prevPage() {
    const newOffset = Math.max(0, offset - limit);
    setOffset(newOffset);
    void load(filterAction, newOffset);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← Админка
          </Link>
          <h1 className="text-xl font-semibold mt-2">Audit log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            История действий super_admin: апрувы, отказы, блокировки, ресеты паролей, входы
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Все действия</option>
            <option value="trainer_approved">Approved</option>
            <option value="trainer_rejected">Rejected</option>
            <option value="trainer_suspended">Suspended</option>
            <option value="trainer_reactivated">Reactivated</option>
            <option value="trainer_password_reset">Password reset</option>
            <option value="super_admin_login">Super admin login</option>
          </select>
          <span className="text-sm text-muted-foreground ml-auto">
            Всего записей: <strong>{total}</strong>
          </span>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
            Записей нет.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-elevate-1 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Время (МСК)</th>
                    <th className="px-4 py-3 font-medium">Кто</th>
                    <th className="px-4 py-3 font-medium">Действие</th>
                    <th className="px-4 py-3 font-medium">Объект</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                    <th className="px-4 py-3 font-medium">Заметки</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-elevate-1">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.actorName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.actorEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${ACTION_COLORS[r.action] || ""}`}>
                          {ACTION_LABELS[r.action] || r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.targetType === "trainer" && r.targetId ? (
                          <Link
                            href={`/admin/trainers/${r.targetId}`}
                            className="text-primary hover:underline"
                          >
                            {r.targetLabel || r.targetId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{r.targetLabel || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.ipAddress || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.payload && typeof (r.payload as any).notes === "string" ? (
                          <span className="text-muted-foreground">
                            {((r.payload as any).notes as string).slice(0, 80)}
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-muted-foreground">
                  Записи {offset + 1}–{Math.min(offset + limit, total)} из {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={prevPage}
                    disabled={offset === 0}
                    className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
                  >
                    ← Назад
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
                  >
                    Вперёд →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
