// Чистые правила сертификатов (без зависимостей от БД/pdfmake) — легко тестируются.
// stateSnapshot = teams.factoryState на момент финализации: содержит .snapshot
// (полный GameSnapshot из team:game_over) + явные флаги completedAllDays/profitLoss.

export function isTeamCompleted(stateSnapshot: unknown): boolean {
  const ss = (stateSnapshot ?? {}) as Record<string, any>;
  if (ss.completedAllDays === true) return true;
  // gameOver движок ставит ТОЛЬКО в конце последнего дня — авторитетный признак.
  return ss.snapshot?.gameOver === true;
}

export function hasPlayableResult(stateSnapshot: unknown): boolean {
  // Команда реально что-то отыграла: прошёл хотя бы 1 игровой день
  // ИЛИ были продажи/выручка/проход. Защита от выдачи ПУСТОГО сертификата
  // (0 дней, cash = стартовый) при ручной генерации тренером.
  const fin = extractFinancials(stateSnapshot);
  return (
    fin.daysCompleted >= 1 ||
    fin.totalRevenue > 0 ||
    fin.throughput !== 0 ||
    fin.profitLoss !== 0
  );
}

export function extractFinancials(stateSnapshot: unknown): {
  finalCash: number;
  throughput: number;
  profitLoss: number;
  daysCompleted: number;
  totalRevenue: number;
  totalRMCost: number;
  fixedExpenses: number;
} {
  const ss = (stateSnapshot ?? {}) as Record<string, any>;
  const snap = (ss.snapshot ?? {}) as Record<string, any>;
  const summary = (snap.dayEndSummary ?? {}) as Record<string, any>;
  const num = (v: any, d = 0): number => (typeof v === "number" && isFinite(v) ? v : d);
  return {
    finalCash: num(snap.cash, num(ss.finalCash)),
    throughput: num(summary.throughput, num(snap.totalRevenue) - num(snap.totalRMCost)),
    profitLoss: num(summary.profitLoss, num(ss.profitLoss)),
    daysCompleted: num(snap.day),
    totalRevenue: num(snap.totalRevenue),
    totalRMCost: num(snap.totalRMCost),
    fixedExpenses: num(snap.fixedExpenses),
  };
}
