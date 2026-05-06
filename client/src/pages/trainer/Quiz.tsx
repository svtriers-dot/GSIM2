import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { authJson, getTrainerToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  question: string;
  options: string[];
}

interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  details: Array<{ id: number; correct: boolean; correctAnswer: number; explanation: string }>;
}

export default function TrainerQuiz() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getTrainerToken()) {
      navigate("/trainer/login");
      return;
    }
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await authJson<{ questions: Question[] }>("/api/trainer/onboarding/quiz");
      setQuestions(data.questions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (Object.keys(answers).length !== questions.length) {
      toast({ title: "Ответьте на все вопросы", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const ordered = questions.map((q, idx) => answers[idx] ?? -1);
      const r = await authJson<QuizResult>("/api/trainer/onboarding/quiz", {
        method: "POST",
        body: JSON.stringify({ answers: ordered }),
      });
      setResult(r);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Загрузка вопросов...</div>
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <Link href="/trainer/onboarding" className="text-primary hover:underline">
          ← К онбордингу
        </Link>
      </div>
    );

  if (result) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div
            className={`rounded-xl p-8 text-center ${
              result.passed
                ? "bg-green-50 border-2 border-green-300"
                : "bg-amber-50 border-2 border-amber-300"
            }`}
          >
            <div className="text-5xl mb-4">{result.passed ? "🎉" : "🔄"}</div>
            <h1 className="text-3xl font-semibold mb-2">
              {result.score} / {result.total}
            </h1>
            <p className="text-lg mb-2">
              {result.passed
                ? "Квиз пройден!"
                : "Не хватает 1-2 правильных ответов. Можно перепройти после изучения теории."}
            </p>
            {result.passed && (
              <p className="text-sm text-muted-foreground">
                Результат сохранён. Вернитесь на онбординг, чтобы продолжить.
              </p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Разбор ответов</h2>
            {questions.map((q, idx) => {
              const det = result.details[idx];
              const userAns = answers[idx];
              return (
                <div
                  key={q.id}
                  className={`bg-card border rounded-xl p-4 ${
                    det.correct ? "border-green-300" : "border-red-300"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span>{det.correct ? "✅" : "❌"}</span>
                    <h3 className="font-medium flex-1">{idx + 1}. {q.question}</h3>
                  </div>
                  <div className="text-sm space-y-1 ml-7">
                    <div>
                      <span className="text-muted-foreground">Ваш ответ:</span>{" "}
                      {q.options[userAns] || "—"}
                    </div>
                    {!det.correct && (
                      <div className="text-green-700">
                        <span className="text-muted-foreground">Правильный:</span>{" "}
                        {q.options[det.correctAnswer]}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 italic">
                      💡 {det.explanation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6 justify-center">
            <Link
              href="/trainer/onboarding"
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              {result.passed ? "К онбордингу →" : "Назад к онбордингу"}
            </Link>
            {!result.passed && (
              <Link
                href="/trainer/learn"
                className="px-5 py-2.5 rounded-lg border border-border"
              >
                Освежить теорию
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-4 text-sm">
          <Link href="/trainer/onboarding" className="text-muted-foreground hover:underline">
            ← К онбордингу
          </Link>
          <Link href="/" className="text-muted-foreground hover:underline">
            На главную
          </Link>
        </div>
        <h1 className="text-2xl font-semibold mt-2 mb-2">Квиз: Теория ограничений</h1>
        <p className="text-sm text-muted-foreground mb-6">
          7 вопросов. Минимум 5 правильных для прохождения. Можно перепройти.
        </p>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-medium mb-3">
                {idx + 1}. {q.question}
              </h3>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      answers[idx] === optIdx
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-elevate-1"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${idx}`}
                      value={optIdx}
                      checked={answers[idx] === optIdx}
                      onChange={() => setAnswers({ ...answers, [idx]: optIdx })}
                      className="mt-1"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Отвечено: {Object.keys(answers).length} / {questions.length}
          </span>
          <button
            onClick={submit}
            disabled={submitting || Object.keys(answers).length !== questions.length}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {submitting ? "Проверяю..." : "Отправить ответы"}
          </button>
        </div>
      </div>
    </div>
  );
}
