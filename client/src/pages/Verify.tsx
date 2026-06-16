import { useEffect, useState } from "react";
import { useRoute } from "wouter";

interface VerifyResult {
  valid: boolean;
  trainerName?: string;
  organization?: string | null;
  issuedAt?: string;
  quizScore?: number;
  practiceFinalCash?: number;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

export default function Verify() {
  const [, params] = useRoute("/verify/:publicId");
  const [data, setData] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.publicId) return;
    fetch(`/api/verify/${params.publicId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, [params?.publicId]);

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Проверка...
      </div>
    );

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <a href="/" className="text-sm text-muted-foreground hover:underline">
            ← TessTOC
          </a>
          <h1 className="text-2xl font-semibold mt-2">Проверка сертификата</h1>
        </div>

        {!data.valid ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
            <div className="text-5xl mb-3">❌</div>
            <h2 className="text-xl font-semibold mb-2">Сертификат не найден</h2>
            {data.revokedAt && (
              <>
                <p className="text-sm text-red-700 mb-2">
                  Отозван{" "}
                  {new Date(data.revokedAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {data.revokedReason && (
                  <p className="text-xs text-red-600 italic">{data.revokedReason}</p>
                )}
              </>
            )}
            {!data.revokedAt && (
              <p className="text-sm text-muted-foreground">
                Сертификат с таким идентификатором не существует. Возможно, ссылка повреждена.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-semibold mb-1">Сертификат подлинный</h2>
            <p className="text-sm text-muted-foreground mb-6">
              TessTOC Certified Trainer
            </p>

            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="text-2xl font-bold mb-1">{data.trainerName}</div>
              {data.organization && (
                <div className="text-sm text-muted-foreground">{data.organization}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Дата выдачи</div>
                <div className="font-medium">
                  {data.issuedAt &&
                    new Date(data.issuedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Квиз ТОС</div>
                <div className="font-medium">{data.quizScore} / 7</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Этот тренер прошёл сертификацию: тест на знание Теории ограничений и пробный
              прогон симулятора с результатом ${data.practiceFinalCash?.toLocaleString("ru-RU")} ₽.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-8">
          TessTOC · симулятор Теории ограничений · {" "}
          <a href="https://toc.tesstech.ru" className="hover:underline">
            toc.tesstech.ru
          </a>
        </p>
      </div>
    </div>
  );
}
