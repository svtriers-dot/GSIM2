import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { teamJson, getDeviceToken, clearTeamSession } from "@/lib/auth";
import { downloadCertificatePng } from "@/lib/certificateCanvas";

interface MeResponse {
  team: { id: string; name: string; color: string; sessionId: string };
  members: { id: string; fullName: string }[];
  session: { name: string; accessCode: string; status: string } | null;
}

interface CertItem {
  id: string;
  teamMemberId: string;
  fullName: string;
  badge: "top1" | "top2" | "top3" | null;
  isTop3: boolean;
  generatedAt: string;
  scoreBreakdown?: Record<string, any> | null;
}

interface CertsResponse {
  ready: boolean;
  status?: string;
  certificates: CertItem[];
}

const BADGE_LABEL: Record<string, string> = {
  top1: "🥇",
  top2: "🥈",
  top3: "🥉",
};

export default function PlayResult() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certs, setCerts] = useState<CertsResponse | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!getDeviceToken()) {
      navigate("/play/join");
      return;
    }
    teamJson<MeResponse>("/api/teams/me")
      .then(setMe)
      .catch((e) => setError(e.message));
    void loadCerts();
    const id = setInterval(loadCerts, 6000); // авто-poll пока не готовы
    return () => clearInterval(id);
  }, []);

  async function loadCerts() {
    try {
      const data = await teamJson<CertsResponse>("/api/teams/me/certificates");
      setCerts(data);
    } catch {
      // оставляем предыдущее
    }
  }

  function download(cert: CertItem) {
    setDownloading(cert.id);
    try {
      const sb = (cert.scoreBreakdown ?? {}) as Record<string, any>;
      const num = (v: any) => (typeof v === "number" && isFinite(v) ? v : 0);
      // Тот же рендерер, что у участника в игре и у тренера — единый сертификат
      downloadCertificatePng({
        name: cert.fullName,
        totalRevenue: num(sb.totalRevenue),
        totalRMCost: num(sb.totalRMCost),
        fixedExpenses: num(sb.fixedExpenses),
        finalCash: num(sb.finalCash),
        throughput: num(sb.throughput),
        profitLoss: num(sb.profitLoss),
        sold: (sb.sold ?? {}) as Record<string, number>,
        date: cert.generatedAt ? new Date(cert.generatedAt) : undefined,
      });
    } finally {
      setDownloading(null);
    }
  }

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
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

        <div className="mb-6 text-left">
          <h3 className="text-sm font-semibold mb-2 text-center">Сертификаты участников</h3>

          {!certs || !certs.ready ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Сертификаты выдаются после завершения игры (все 5 дней).
              {certs?.status && certs.status !== "ended" ? (
                <div className="text-xs mt-1">
                  Статус сессии: <span className="font-mono">{certs.status}</span>
                </div>
              ) : null}
            </div>
          ) : certs.certificates.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Сертификаты выдаются только командам, прошедшим все 5 дней. Если игра
              была остановлена тренером раньше — сертификат не выдаётся. Если игра
              завершена, обновите страницу через минуту.
            </div>
          ) : (
            <ul className="space-y-2">
              {me.members.map((m) => {
                const cert = certs.certificates.find((c) => c.teamMemberId === m.id);
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between bg-elevate-1 border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-sm">
                      {cert?.badge ? `${BADGE_LABEL[cert.badge]} ` : ""}
                      {m.fullName}
                    </span>
                    {cert ? (
                      <button
                        type="button"
                        onClick={() => download(cert)}
                        disabled={downloading === cert.id}
                        className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                      >
                        {downloading === cert.id ? "..." : "📄 Скачать"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            data-testid="button-replay"
            onClick={() => navigate("/play/session?replay=1")}
            className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium border border-border"
          >
            🔄 Сыграть заново
          </button>
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
