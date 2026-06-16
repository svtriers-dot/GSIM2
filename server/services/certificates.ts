// PDF-сертификаты участников. pdfmake — без headless browser, серверная генерация.

import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { db } from "../db";
import {
  certificates,
  teamMembers,
  teams,
  sessions,
  trainers,
  rounds,
  teamRoundResults,
} from "@shared/schema";
import { and, eq, inArray, asc } from "drizzle-orm";
import { isTeamCompleted, extractFinancials } from "../lib/certificateRules";

// Стандартные шрифты pdfmake (встроены в библиотеку)
const fonts = {
  Roboto: {
    normal: "node_modules/pdfmake/build/vfs_fonts.js",
  },
};

// Используем pdfmake с встроенным VFS — он содержит Roboto + кириллицу
// Альтернатива: подгрузить vfs_fonts вручную и применить

let printer: PdfPrinter;
function getPrinter(): PdfPrinter {
  if (!printer) {
    // pdfmake 0.2.x: vfs_fonts.js экспортирует напрямую { "Roboto-Regular.ttf": "..base64..", ... }
    // (раньше было обёрнуто в .pdfMake.vfs — поэтому fallback'и для совместимости).
    const vfs: Record<string, string> = require("pdfmake/build/vfs_fonts.js");
    const pick = (name: string): string =>
      (vfs as any)?.[name] ??
      (vfs as any)?.default?.[name] ??
      (vfs as any)?.pdfMake?.vfs?.[name] ??
      (vfs as any)?.default?.pdfMake?.vfs?.[name] ??
      "";
    const robotoNormal = pick("Roboto-Regular.ttf");
    if (!robotoNormal) {
      throw new Error("pdfmake vfs_fonts: Roboto-Regular.ttf не найден — проверь установку pdfmake");
    }
    const fontDef = {
      Roboto: {
        normal: Buffer.from(robotoNormal, "base64"),
        bold: Buffer.from(pick("Roboto-Medium.ttf"), "base64"),
        italics: Buffer.from(pick("Roboto-Italic.ttf"), "base64"),
        bolditalics: Buffer.from(pick("Roboto-MediumItalic.ttf"), "base64"),
      },
    };
    printer = new PdfPrinter(fontDef);
  }
  return printer;
}

interface CertificateData {
  fullName: string;
  teamName: string;
  sessionName: string;
  trainerName: string;
  trainerOrganization: string | null;
  finalCash: number;
  throughput: number;
  profitLoss: number;
  daysCompleted: number;
  totalRevenue: number;
  totalRMCost: number;
  fixedExpenses: number;
  rankInRound: number;
  totalTeams: number;
  badge: "top1" | "top2" | "top3" | null;
  date: Date;
  certId: string;
}

const BADGE_LABELS: Record<string, string> = {
  top1: "🥇 Золото — Лучший throughput",
  top2: "🥈 Серебро",
  top3: "🥉 Бронза",
};

export function buildCertificatePdf(data: CertificateData): Promise<Buffer> {
  // pdfmake падает если в тексте есть emoji/символы вне Roboto. Уберём emoji и оставим текст.
  const badgeText = data.badge
    ? data.badge === "top1"
      ? "ЗОЛОТО — победитель раунда"
      : data.badge === "top2"
        ? "СЕРЕБРО — второе место"
        : "БРОНЗА — третье место"
    : null;

  const dateStr = data.date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [60, 50, 60, 50],
    background: (_cur: number, pageSize: { width: number; height: number }) => ({
      canvas: [
        { type: "rect", x: 18, y: 18, w: pageSize.width - 36, h: pageSize.height - 36, lineWidth: 2.5, lineColor: "#11192d" },
        { type: "rect", x: 26, y: 26, w: pageSize.width - 52, h: pageSize.height - 52, lineWidth: 1, lineColor: "#c9a84c" },
      ],
    }),
    content: [
      {
        text: "СЕРТИФИКАТ",
        style: "title",
        alignment: "center",
        margin: [0, 20, 0, 0],
      },
      {
        text: "об участии в мастер-классе по Теории ограничений",
        style: "subtitle",
        alignment: "center",
        margin: [0, 10, 0, 30],
      },
      {
        canvas: [
          { type: "line", x1: 100, y1: 0, x2: 600, y2: 0, lineWidth: 1, lineColor: "#a8a25a" },
        ],
        margin: [0, 0, 0, 30],
      },
      {
        text: "Настоящий сертификат подтверждает, что",
        alignment: "center",
        fontSize: 13,
        color: "#666",
        margin: [0, 0, 0, 16],
      },
      {
        text: data.fullName,
        style: "name",
        alignment: "center",
        margin: [0, 0, 0, 16],
      },
      {
        text: [
          "успешно прошёл(а) учебную сессию ",
          { text: `«${data.sessionName}»`, italics: true },
        ],
        alignment: "center",
        fontSize: 13,
        color: "#444",
        margin: [0, 0, 0, 30],
      },
      {
        text: `Все ${data.daysCompleted} дней игры пройдены`,
        alignment: "center",
        fontSize: 11,
        color: "#888",
        margin: [0, 0, 0, 14],
      },
      // Финансовый результат — крупно, с цветом
      {
        text: data.profitLoss >= 0 ? "ЧИСТАЯ ПРИБЫЛЬ" : "УБЫТОК",
        style: "metricLabel",
        alignment: "center",
      },
      {
        text: `${data.profitLoss >= 0 ? "+" : ""}${data.profitLoss.toLocaleString("ru-RU")} руб.`,
        alignment: "center",
        fontSize: 30,
        bold: true,
        color: data.profitLoss >= 0 ? "#1a7a2a" : "#b82020",
        margin: [0, 2, 0, 16],
      },
      // Полная сетка метрик
      {
        columns: [
          { width: "*", stack: [ { text: "Выручка", style: "metricLabel", alignment: "center" }, { text: `${data.totalRevenue.toLocaleString("ru-RU")} руб.`, style: "metricMid", alignment: "center" } ] },
          { width: "*", stack: [ { text: "Затраты на сырьё", style: "metricLabel", alignment: "center" }, { text: `${data.totalRMCost.toLocaleString("ru-RU")} руб.`, style: "metricMid", alignment: "center" } ] },
          { width: "*", stack: [ { text: "Проход (Throughput)", style: "metricLabel", alignment: "center" }, { text: `${data.throughput.toLocaleString("ru-RU")} руб.`, style: "metricMid", alignment: "center" } ] },
          { width: "*", stack: [ { text: "Итоговый cash", style: "metricLabel", alignment: "center" }, { text: `${data.finalCash.toLocaleString("ru-RU")} руб.`, style: "metricMid", alignment: "center" } ] },
          { width: "*", stack: [ { text: "Место", style: "metricLabel", alignment: "center" }, { text: `${data.rankInRound} из ${data.totalTeams}`, style: "metricMid", alignment: "center" } ] },
        ],
        margin: [0, 0, 0, 26],
      },
      ...(badgeText
        ? [
            {
              text: badgeText,
              alignment: "center" as const,
              fontSize: 16,
              bold: true,
              color: "#a8a25a",
              margin: [0, 0, 0, 20] as [number, number, number, number],
            },
          ]
        : []),
      {
        canvas: [
          { type: "line", x1: 100, y1: 0, x2: 600, y2: 0, lineWidth: 1, lineColor: "#a8a25a" },
        ],
        margin: [0, 20, 0, 16],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: dateStr, fontSize: 10, color: "#888", alignment: "center" },
              { text: "Дата проведения", fontSize: 9, color: "#aaa", alignment: "center" },
            ],
          },
          {
            width: "*",
            stack: [
              {
                text: data.trainerName,
                fontSize: 10,
                color: "#888",
                alignment: "center",
              },
              {
                text: data.trainerOrganization
                  ? `Тренер · ${data.trainerOrganization}`
                  : "Тренер",
                fontSize: 9,
                color: "#aaa",
                alignment: "center",
              },
            ],
          },
          {
            width: "*",
            stack: [
              { text: data.certId.slice(0, 8).toUpperCase(), fontSize: 10, color: "#888", alignment: "center" },
              {
                text: "ID для верификации",
                fontSize: 9,
                color: "#aaa",
                alignment: "center",
              },
            ],
          },
        ],
      },
      {
        text: "Tess Technology · стратегия, основанная на цифрах",
        fontSize: 10,
        color: "#11192d",
        bold: true,
        alignment: "center",
        margin: [0, 26, 0, 0],
      },
      {
        text: "TessTOC · симулятор Теории ограничений · toc.tesstech.ru",
        fontSize: 8,
        color: "#bbb",
        alignment: "center",
        margin: [0, 4, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 36, bold: true, color: "#11192d" },
      subtitle: { fontSize: 14, color: "#666" },
      name: { fontSize: 28, bold: true, color: "#11192d" },
      metricLabel: { fontSize: 10, color: "#888" },
      metricValue: { fontSize: 22, bold: true, color: "#11192d" },
      metricMid: { fontSize: 14, bold: true, color: "#11192d" },
    },
    defaultStyle: { font: "Roboto", fontSize: 11 },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = getPrinter().createPdfKitDocument(docDef);
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (c: Buffer) => chunks.push(c));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      pdfDoc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// =============================================================================
// Batch: создание сертификатов для всех team_members сессии после её завершения
// =============================================================================

export async function generateCertificatesForSession(
  sessionId: string,
  opts: { requireCompletion?: boolean } = {},
): Promise<{
  generated: number;
  total: number;
}> {
  const requireCompletion = opts.requireCompletion !== false; // default true (авто/lazy выдача)
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session) throw new Error("session_not_found");

  const [trainer] = await db.select().from(trainers).where(eq(trainers.id, session.trainerId)).limit(1);
  if (!trainer) throw new Error("trainer_not_found");

  // Берём последний завершённый раунд
  const allRounds = await db
    .select()
    .from(rounds)
    .where(eq(rounds.sessionId, sessionId))
    .orderBy(asc(rounds.roundNumber));
  const lastFinished = [...allRounds].reverse().find((r) => r.status === "ended");
  if (!lastFinished) {
    throw new Error("no_finished_round");
  }

  const sessionTeams = await db.select().from(teams).where(eq(teams.sessionId, sessionId));
  const teamIds = sessionTeams.map((t) => t.id);
  if (teamIds.length === 0) {
    return { generated: 0, total: 0 };
  }

  const allMembers = await db
    .select()
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, teamIds));
  const allResults = await db
    .select()
    .from(teamRoundResults)
    .where(
      and(
        eq(teamRoundResults.roundId, lastFinished.id),
        inArray(teamRoundResults.teamId, teamIds),
      ),
    );

  const totalTeams = sessionTeams.length;
  let generated = 0;

  for (const member of allMembers) {
    const team = sessionTeams.find((t) => t.id === member.teamId);
    if (!team) continue;
    const result = allResults.find((r) => r.teamId === member.teamId);
    // ГЕЙТ: сертификат только если команда реально прошла все 5 дней (gameOver).
    // Если тренер остановил раньше — снапшот без gameOver → пропускаем.
    if (requireCompletion && !isTeamCompleted(result?.stateSnapshot)) continue;
    const fin = extractFinancials(result?.stateSnapshot);
    const rank = result?.rankInRound ?? totalTeams;
    const badge: "top1" | "top2" | "top3" | null =
      rank === 1 ? "top1" : rank === 2 ? "top2" : rank === 3 ? "top3" : null;

    // Уже выдан?
    const existing = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.teamMemberId, member.id),
          eq(certificates.sessionId, sessionId),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;

    const [cert] = await db
      .insert(certificates)
      .values({
        teamMemberId: member.id,
        sessionId,
        scoreBreakdown: {
          finalCash: fin.finalCash || (result?.finalCash ?? 0),
          throughput: fin.throughput || (result?.throughput ?? 0),
          inventory: result?.inventory ?? 0,
          operatingExpense: result?.operatingExpense ?? 0,
          profitLoss: fin.profitLoss,
          daysCompleted: fin.daysCompleted,
          totalRevenue: fin.totalRevenue,
          totalRMCost: fin.totalRMCost,
          fixedExpenses: fin.fixedExpenses,
          rankInRound: rank,
          totalTeams,
        },
        isTop3: badge !== null,
        badge,
        pdfUrl: null, // PDF генерируется по требованию
      })
      .returning();
    generated += 1;
  }

  return { generated, total: allMembers.length };
}

// PDF-генерация по требованию (lazy) — кешируется в памяти процесса
const pdfCache = new Map<string, Buffer>();

export async function getCertificatePdf(certificateId: string): Promise<{
  buffer: Buffer;
  filename: string;
} | null> {
  if (pdfCache.has(certificateId)) {
    const buf = pdfCache.get(certificateId)!;
    return { buffer: buf, filename: `certificate-${certificateId.slice(0, 8)}.pdf` };
  }

  const [cert] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.id, certificateId))
    .limit(1);
  if (!cert) return null;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, cert.teamMemberId))
    .limit(1);
  if (!member) return null;

  const [team] = await db.select().from(teams).where(eq(teams.id, member.teamId)).limit(1);
  if (!team) return null;

  const [session] = await db.select().from(sessions).where(eq(sessions.id, cert.sessionId)).limit(1);
  if (!session) return null;

  const [trainer] = await db.select().from(trainers).where(eq(trainers.id, session.trainerId)).limit(1);
  if (!trainer) return null;

  const score = (cert.scoreBreakdown ?? {}) as Record<string, number>;

  const buf = await buildCertificatePdf({
    fullName: member.fullName,
    teamName: team.name,
    sessionName: session.name,
    trainerName: trainer.name,
    trainerOrganization: trainer.organization,
    finalCash: Number(score.finalCash ?? 0),
    throughput: Number(score.throughput ?? 0),
    profitLoss: Number(score.profitLoss ?? 0),
    daysCompleted: Number(score.daysCompleted ?? 0),
    totalRevenue: Number(score.totalRevenue ?? 0),
    totalRMCost: Number(score.totalRMCost ?? 0),
    fixedExpenses: Number(score.fixedExpenses ?? 0),
    rankInRound: Number(score.rankInRound ?? 0),
    totalTeams: Number(score.totalTeams ?? 0),
    badge: cert.badge as "top1" | "top2" | "top3" | null,
    date: cert.generatedAt,
    certId: cert.id,
  });

  pdfCache.set(cert.id, buf);
  return { buffer: buf, filename: `${member.fullName.replace(/\s+/g, "_")}-${cert.id.slice(0, 8)}.pdf` };
}

export async function listCertificatesForSession(sessionId: string) {
  const certs = await db
    .select({
      id: certificates.id,
      teamMemberId: certificates.teamMemberId,
      sessionId: certificates.sessionId,
      scoreBreakdown: certificates.scoreBreakdown,
      isTop3: certificates.isTop3,
      badge: certificates.badge,
      generatedAt: certificates.generatedAt,
      memberFullName: teamMembers.fullName,
      teamId: teamMembers.teamId,
    })
    .from(certificates)
    .leftJoin(teamMembers, eq(teamMembers.id, certificates.teamMemberId))
    .where(eq(certificates.sessionId, sessionId));

  // подтянем имена команд
  const teamIds = Array.from(new Set(certs.map((c) => c.teamId).filter(Boolean))) as string[];
  const teamRows = teamIds.length
    ? await db.select().from(teams).where(inArray(teams.id, teamIds))
    : [];

  return certs.map((c) => {
    const t = teamRows.find((tt) => tt.id === c.teamId);
    return {
      ...c,
      teamName: t?.name ?? null,
      teamColor: t?.color ?? null,
    };
  });
}


// =============================================================================
// MVP-2 Onboarding: PDF сертификата тренера с QR-кодом верификации
// =============================================================================

import * as QRCode from "qrcode";

interface TrainerCertData {
  trainerName: string;
  organization: string | null;
  publicId: string;
  verifyUrl: string;
  quizScore: number;
  practiceFinalCash: number;
  issuedAt: Date;
}

export async function buildTrainerCertificatePdf(data: TrainerCertData): Promise<Buffer> {
  // Генерируем QR-код как Data URL → конвертируем в base64 для pdfmake image
  const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: { dark: "#11192d", light: "#ffffff" },
  });

  const dateStr = data.issuedAt.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [50, 40, 50, 40],
    content: [
      {
        text: "СЕРТИФИКАТ ТРЕНЕРА",
        style: "title",
        alignment: "center",
        margin: [0, 10, 0, 0],
      },
      {
        text: "TessTOC · Симулятор Теории ограничений",
        style: "subtitle",
        alignment: "center",
        margin: [0, 8, 0, 24],
      },
      {
        canvas: [{ type: "line", x1: 100, y1: 0, x2: 600, y2: 0, lineWidth: 1, lineColor: "#a8a25a" }],
        margin: [0, 0, 0, 24],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: "Настоящий сертификат подтверждает, что",
                alignment: "center",
                fontSize: 12,
                color: "#666",
                margin: [0, 0, 0, 14],
              },
              {
                text: data.trainerName,
                style: "name",
                alignment: "center",
                margin: [0, 0, 0, 12],
              },
              ...(data.organization
                ? [
                    {
                      text: data.organization,
                      alignment: "center" as const,
                      fontSize: 11,
                      color: "#888",
                      margin: [0, 0, 0, 14] as [number, number, number, number],
                    },
                  ]
                : []),
              {
                text: "успешно прошёл/а сертификацию TessTOC и допущен/а к проведению",
                alignment: "center",
                fontSize: 12,
                color: "#444",
              },
              {
                text: "мастер-классов по Теории ограничений",
                alignment: "center",
                fontSize: 12,
                color: "#444",
                margin: [0, 0, 0, 18],
              },
              // Метрики
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      { text: "Квиз ТОС", style: "metricLabel", alignment: "center" },
                      { text: `${data.quizScore} / 7`, style: "metricValue", alignment: "center" },
                    ],
                  },
                  {
                    width: "*",
                    stack: [
                      { text: "Пробный прогон", style: "metricLabel", alignment: "center" },
                      {
                        text: `$${data.practiceFinalCash.toLocaleString("en-US")}`,
                        style: "metricValue",
                        alignment: "center",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            width: 200,
            stack: [
              {
                image: qrDataUrl,
                width: 160,
                alignment: "center",
              },
              {
                text: "Проверить подлинность",
                fontSize: 9,
                color: "#888",
                alignment: "center",
                margin: [0, 4, 0, 2],
              },
              {
                text: data.verifyUrl,
                fontSize: 8,
                color: "#aaa",
                alignment: "center",
              },
            ],
          },
        ],
      },
      {
        canvas: [{ type: "line", x1: 100, y1: 0, x2: 600, y2: 0, lineWidth: 1, lineColor: "#a8a25a" }],
        margin: [0, 24, 0, 14],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: dateStr, fontSize: 10, color: "#888", alignment: "center" },
              { text: "Дата выдачи", fontSize: 9, color: "#aaa", alignment: "center" },
            ],
          },
          {
            width: "*",
            stack: [
              { text: data.publicId, fontSize: 10, color: "#888", alignment: "center", style: "monoText" },
              { text: "ID сертификата", fontSize: 9, color: "#aaa", alignment: "center" },
            ],
          },
        ],
      },
      {
        text: "TessTOC · toc.tesstech.ru",
        fontSize: 8,
        color: "#bbb",
        alignment: "center",
        margin: [0, 22, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 32, bold: true, color: "#11192d" },
      subtitle: { fontSize: 13, color: "#666" },
      name: { fontSize: 26, bold: true, color: "#11192d" },
      metricLabel: { fontSize: 10, color: "#888" },
      metricValue: { fontSize: 18, bold: true, color: "#11192d" },
      monoText: { font: "Roboto" },
    },
    defaultStyle: { font: "Roboto", fontSize: 11 },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = getPrinter().createPdfKitDocument(docDef);
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (c: Buffer) => chunks.push(c));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      pdfDoc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Кеш в памяти — генерация PDF медленная, не делаем на каждый запрос
const trainerCertCache = new Map<string, Buffer>();

export async function getTrainerCertificatePdf(trainerId: string): Promise<{
  buffer: Buffer;
  filename: string;
} | null> {
  const { trainerCertifications, trainers } = await import("@shared/schema");
  const cached = trainerCertCache.get(trainerId);
  // Перечитаем из БД даже если cached — на случай отзыва
  const [cert] = await db
    .select()
    .from(trainerCertifications)
    .where(eq(trainerCertifications.trainerId, trainerId))
    .limit(1);
  if (!cert || cert.revokedAt) return null;

  if (cached) {
    return { buffer: cached, filename: `tesstoc-trainer-${cert.publicId}.pdf` };
  }

  const [trainer] = await db
    .select({ name: trainers.name, organization: trainers.organization })
    .from(trainers)
    .where(eq(trainers.id, trainerId))
    .limit(1);
  if (!trainer) return null;

  const baseUrl =
    process.env.PUBLIC_BASE_URL || "https://toc.tesstech.ru";

  const buf = await buildTrainerCertificatePdf({
    trainerName: trainer.name,
    organization: trainer.organization,
    publicId: cert.publicId,
    verifyUrl: `${baseUrl}/verify/${cert.publicId}`,
    quizScore: cert.quizScore,
    practiceFinalCash: cert.practiceFinalCash,
    issuedAt: cert.issuedAt,
  });

  trainerCertCache.set(trainerId, buf);
  return { buffer: buf, filename: `tesstoc-trainer-${cert.publicId}.pdf` };
}
