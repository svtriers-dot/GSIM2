// MVP-2 Onboarding: квиз ТОС + проверка прогресса сертификации
//
// Сертификация = успешное прохождение всех 4 шагов:
// 1. Тренер прочитал теорию ТОС (страница /trainer/learn) — фиксируется флагом
//    при заходе на /trainer/quiz (значит уже изучил, либо по тур-завершению)
// 2. Прошёл квиз: 5+ из 7 правильных ответов
// 3. Сыграл пробный прогон: finalCash > $14000 (уровень medium)
// 4. Апрув от super_admin

import { customAlphabet } from "nanoid";
import { db } from "../db";
import { trainers, trainerCertifications } from "@shared/schema";
import { eq } from "drizzle-orm";

// Минимум для прохождения квиза
export const QUIZ_PASS_THRESHOLD = 5;
// Минимальный finalCash для зачёта пробного прогона
export const PRACTICE_MIN_CASH = 14000;

// 12-символьный публичный ID (без 0/O/I/1/L)
const generatePublicId = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz", 12);

// =============================================================================
// КВИЗ — 7 вопросов про ТОС и интерфейс тренера
// =============================================================================

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // не отправляется клиенту
  explanation: string;   // показывается после прохождения
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Что такое узкое место (bottleneck) по Теории ограничений?",
    options: [
      "Самая дорогая станция в производстве",
      "Ресурс с минимальной пропускной способностью, ограничивающий throughput всей системы",
      "Станция с самой длинной очередью продуктов",
      "Любой ресурс, загруженный более чем на 80%",
    ],
    correctAnswer: 1,
    explanation:
      "Bottleneck — ресурс, чья пропускная способность меньше или равна спросу. Он определяет throughput всей системы. Не важна цена и длина очереди — важно соотношение capacity vs demand.",
  },
  {
    id: 2,
    question: "Что НЕ относится к 5 шагам ТОС-процесса непрерывного улучшения?",
    options: [
      "Найти ограничение системы",
      "Подчинить остальное решению по ограничению",
      "Максимально загрузить все ресурсы",
      "Не дать инерции стать новым ограничением",
    ],
    correctAnswer: 2,
    explanation:
      "5 шагов Голдратта: 1) Identify (найти), 2) Exploit (макс. использовать), 3) Subordinate (подчинить остальное), 4) Elevate (расширить), 5) Repeat (не дать инерции). Загружать все ресурсы — это типичная ошибка локальной оптимизации.",
  },
  {
    id: 3,
    question:
      "Throughput в ТОС — это:",
    options: [
      "Объём произведённой продукции в единицах",
      "Скорость, с которой система генерирует деньги через продажи (выручка минус сырьё)",
      "Загрузка узкого места в процентах",
      "Сумма всех произведённых товаров на складе",
    ],
    correctAnswer: 1,
    explanation:
      "Throughput по Голдратту — деньги, заработанные за период, не штуки. Формула: revenue − raw_material_cost. Только проданное товарищу даёт throughput.",
  },
  {
    id: 4,
    question:
      "Что важнее с точки зрения ТОС?",
    options: [
      "Загрузить все станции на 100% — это эффективно",
      "Минимизировать запасы любой ценой",
      "Максимизировать throughput, даже ценой простоя не-узких ресурсов",
      "Снижать operating expense — это снижает себестоимость",
    ],
    correctAnswer: 2,
    explanation:
      "Локальная эффективность ≠ глобальная. Не-узкое ресурсы должны простаивать, иначе раздуют WIP. По ТОС: throughput первично, OE вторично, inventory минимально.",
  },
  {
    id: 5,
    question:
      "В вашем мастер-классе участник видит cash в минусе. По ТОС это означает:",
    options: [
      "Команда плохо играет — слишком много станков купила",
      "Throughput системы меньше operating expense",
      "Команда не использует полностью производственный потенциал",
      "У команды слишком высокий inventory",
    ],
    correctAnswer: 1,
    explanation:
      "Cash тает когда расходы (постоянка + сырьё) превышают доход. По ТОС-формуле прибыль = throughput − OE. Если throughput низкий — обычно из-за неработающего узкого места.",
  },
  {
    id: 6,
    question:
      "Тренер видит на дашборде: команда A — bottleneck E5, команда B — bottleneck blue. Что лучше делать?",
    options: [
      "Сразу подсказать обоим командам как решить",
      "Спросить команду А что они думают про загрузку E5, а команду B — про blue",
      "Поставить паузу и провести разбор пока узкие места не решены",
      "Всё нормально, узкие места всегда есть",
    ],
    correctAnswer: 1,
    explanation:
      "Принцип сократического диалога в обучении ТОС: тренер не даёт готовых ответов. Вопросы наводят команду на самостоятельный inсайт. Пауза/подсказка убивают обучающий момент.",
  },
  {
    id: 7,
    question:
      "После первого раунда команды показали разный finalCash. Что важнее для дебрифа?",
    options: [
      "Объявить победителей и поздравить лидеров",
      "Сравнить решения команд: какие подходы привели к разному throughput",
      "Указать командам с минусом на их ошибки",
      "Перейти сразу ко второму раунду чтобы догнать программу",
    ],
    correctAnswer: 1,
    explanation:
      "Дебриф — главный обучающий момент. Сравнение стратегий (а не объявление победителей) даёт инсайт. По ТОС: 'идентифицировать узкое место' начинается с правильных вопросов.",
  },
];

// Возвращает квиз без правильных ответов и explanation (только question + options)
export function getQuizQuestionsForClient(): Array<Omit<QuizQuestion, "correctAnswer" | "explanation">> {
  return QUIZ_QUESTIONS.map(({ id, question, options }) => ({ id, question, options }));
}

// Проверяет ответы и возвращает score + детали
export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  details: Array<{ id: number; correct: boolean; correctAnswer: number; explanation: string }>;
}

export function gradeQuiz(answers: number[]): QuizResult {
  const total = QUIZ_QUESTIONS.length;
  let score = 0;
  const details = QUIZ_QUESTIONS.map((q, idx) => {
    const userAnswer = answers[idx];
    const correct = userAnswer === q.correctAnswer;
    if (correct) score += 1;
    return {
      id: q.id,
      correct,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    };
  });
  return {
    score,
    total,
    passed: score >= QUIZ_PASS_THRESHOLD,
    details,
  };
}

// =============================================================================
// СТАТУС ОНБОРДИНГА
// =============================================================================

export interface OnboardingStatus {
  tourCompleted: boolean;
  quizPassed: boolean;
  quizScore: number | null;
  practicePlayed: boolean;
  practiceFinalCash: number | null;
  isCertified: boolean;
  certifiedAt: string | null;
  certificationPublicId: string | null;
  // Что осталось сделать тренеру
  nextStep:
    | "play_practice"
    | "take_quiz"
    | "wait_approval"
    | "completed"
    | "rejected"
    | "suspended";
  role: string;
}

export async function getOnboardingStatus(trainerId: string): Promise<OnboardingStatus | null> {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(eq(trainers.id, trainerId))
    .limit(1);
  if (!trainer) return null;

  // Получаем certification если есть
  const [cert] = await db
    .select()
    .from(trainerCertifications)
    .where(eq(trainerCertifications.trainerId, trainerId))
    .limit(1);

  const quizPassed = !!trainer.quizPassedAt;
  const practicePlayed = !!trainer.practicePlayedAt;

  let nextStep: OnboardingStatus["nextStep"];
  if (trainer.role === "rejected") nextStep = "rejected";
  else if (trainer.role === "suspended") nextStep = "suspended";
  else if (trainer.role === "active" || trainer.role === "super_admin") nextStep = "completed";
  else if (!practicePlayed) nextStep = "play_practice";
  else if (!quizPassed) nextStep = "take_quiz";
  else nextStep = "wait_approval";

  return {
    tourCompleted: !!trainer.tourCompletedAt,
    quizPassed,
    quizScore: trainer.quizScore,
    practicePlayed,
    practiceFinalCash: trainer.practiceFinalCash,
    isCertified: trainer.isCertified,
    certifiedAt: trainer.certifiedAt?.toISOString() ?? null,
    certificationPublicId: cert?.publicId ?? null,
    nextStep,
    role: trainer.role,
  };
}

// =============================================================================
// ЗАПИСЬ КВИЗА И ПРОБНОГО ПРОГОНА
// =============================================================================

export async function recordQuizAttempt(
  trainerId: string,
  answers: number[],
): Promise<QuizResult> {
  const result = gradeQuiz(answers);

  // Записываем результат если passed (или если это первая попытка) — фиксируем factual
  if (result.passed) {
    await db
      .update(trainers)
      .set({
        quizPassedAt: new Date(),
        quizScore: result.score,
        updatedAt: new Date(),
      })
      .where(eq(trainers.id, trainerId));
  } else {
    // Не passed — обновляем только score (помогает увидеть прогресс попыток)
    const [t] = await db
      .select({ quizScore: trainers.quizScore })
      .from(trainers)
      .where(eq(trainers.id, trainerId))
      .limit(1);
    if (!t || (t.quizScore ?? 0) < result.score) {
      await db
        .update(trainers)
        .set({ quizScore: result.score, updatedAt: new Date() })
        .where(eq(trainers.id, trainerId));
    }
  }

  return result;
}

export async function recordPractice(
  trainerId: string,
  finalCash: number,
): Promise<{ accepted: boolean; minCashRequired: number }> {
  const accepted = finalCash >= PRACTICE_MIN_CASH;
  if (accepted) {
    await db
      .update(trainers)
      .set({
        practicePlayedAt: new Date(),
        practiceFinalCash: finalCash,
        updatedAt: new Date(),
      })
      .where(eq(trainers.id, trainerId));
  } else {
    // Не прошёл — обновим лучший результат для UX (видеть прогресс)
    const [t] = await db
      .select({ practiceFinalCash: trainers.practiceFinalCash })
      .from(trainers)
      .where(eq(trainers.id, trainerId))
      .limit(1);
    if (!t || (t.practiceFinalCash ?? -Infinity) < finalCash) {
      await db
        .update(trainers)
        .set({ practiceFinalCash: finalCash, updatedAt: new Date() })
        .where(eq(trainers.id, trainerId));
    }
  }
  return { accepted, minCashRequired: PRACTICE_MIN_CASH };
}

// =============================================================================
// ВЫПУСК СЕРТИФИКАТА (вызывается при approve)
// =============================================================================

export async function issueCertification(trainerId: string): Promise<{
  publicId: string;
  alreadyExists: boolean;
}> {
  // Проверим что нет существующего активного сертификата
  const [existing] = await db
    .select()
    .from(trainerCertifications)
    .where(eq(trainerCertifications.trainerId, trainerId))
    .limit(1);
  if (existing && !existing.revokedAt) {
    return { publicId: existing.publicId, alreadyExists: true };
  }

  const [trainer] = await db
    .select()
    .from(trainers)
    .where(eq(trainers.id, trainerId))
    .limit(1);
  if (!trainer) throw new Error("trainer_not_found");

  // Generate unique publicId с retry на коллизии
  let publicId = generatePublicId();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.insert(trainerCertifications).values({
        trainerId,
        publicId,
        quizScore: trainer.quizScore ?? 0,
        practiceFinalCash: trainer.practiceFinalCash ?? 0,
      });
      break;
    } catch (e: any) {
      if (e?.code === "23505") {
        publicId = generatePublicId();
        continue;
      }
      throw e;
    }
  }

  await db
    .update(trainers)
    .set({
      isCertified: true,
      certifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(trainers.id, trainerId));

  return { publicId, alreadyExists: false };
}

// =============================================================================
// ПУБЛИЧНАЯ ВЕРИФИКАЦИЯ
// =============================================================================

export interface PublicVerification {
  valid: boolean;
  trainerName?: string;
  organization?: string | null;
  issuedAt?: string;
  quizScore?: number;
  practiceFinalCash?: number;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

export async function verifyCertification(publicId: string): Promise<PublicVerification> {
  const [cert] = await db
    .select()
    .from(trainerCertifications)
    .where(eq(trainerCertifications.publicId, publicId))
    .limit(1);
  if (!cert) return { valid: false };

  const [trainer] = await db
    .select({ name: trainers.name, organization: trainers.organization })
    .from(trainers)
    .where(eq(trainers.id, cert.trainerId))
    .limit(1);

  return {
    valid: !cert.revokedAt,
    trainerName: trainer?.name,
    organization: trainer?.organization ?? null,
    issuedAt: cert.issuedAt.toISOString(),
    quizScore: cert.quizScore,
    practiceFinalCash: cert.practiceFinalCash,
    revokedAt: cert.revokedAt?.toISOString() ?? null,
    revokedReason: cert.revokedReason,
  };
}

// =============================================================================
// PRODUCT-TOUR
// =============================================================================

export async function markTourCompleted(trainerId: string): Promise<void> {
  await db
    .update(trainers)
    .set({ tourCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(trainers.id, trainerId));
}
