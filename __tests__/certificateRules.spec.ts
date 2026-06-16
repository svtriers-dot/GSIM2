import { isTeamCompleted, extractFinancials } from "../server/lib/certificateRules";

let pass = 0, fail = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, info?: any) {
  if (cond) pass++; else { fail++; fails.push(name + (info !== undefined ? `  [${JSON.stringify(info)}]` : "")); }
}

// ---------- isTeamCompleted ----------
ok("completed: gameOver=true → true", isTeamCompleted({ snapshot: { gameOver: true } }) === true);
ok("completed: completedAllDays=true → true", isTeamCompleted({ completedAllDays: true }) === true);
ok("completed: gameOver=false → false", isTeamCompleted({ snapshot: { gameOver: false } }) === false);
ok("completed: пустой объект → false", isTeamCompleted({}) === false);
ok("completed: null → false", isTeamCompleted(null) === false);
ok("completed: undefined → false", isTeamCompleted(undefined) === false);
ok("completed: только метрики без snapshot → false", isTeamCompleted({ finalCash: 5000 }) === false);

// ---------- extractFinancials ----------
const full = {
  completedAllDays: true,
  snapshot: {
    gameOver: true,
    day: 5,
    cash: 7000,
    totalRevenue: 30000,
    totalRMCost: 12000,
    fixedExpenses: 11000,
    dayEndSummary: { throughput: 18000, profitLoss: 7000 },
  },
};
const f = extractFinancials(full);
ok("fin: finalCash из snapshot.cash", f.finalCash === 7000, f.finalCash);
ok("fin: profitLoss из dayEndSummary", f.profitLoss === 7000, f.profitLoss);
ok("fin: throughput из dayEndSummary", f.throughput === 18000, f.throughput);
ok("fin: daysCompleted из snapshot.day", f.daysCompleted === 5, f.daysCompleted);
ok("fin: totalRevenue", f.totalRevenue === 30000, f.totalRevenue);
ok("fin: totalRMCost", f.totalRMCost === 12000, f.totalRMCost);
ok("fin: fixedExpenses", f.fixedExpenses === 11000, f.fixedExpenses);

// throughput fallback = revenue - rmCost
const noSummary = extractFinancials({ snapshot: { totalRevenue: 1000, totalRMCost: 400 } });
ok("fin: throughput fallback = revenue - rmCost", noSummary.throughput === 600, noSummary.throughput);
ok("fin: profitLoss по умолчанию 0", noSummary.profitLoss === 0, noSummary.profitLoss);

// fallback к плоским полям ss.profitLoss / ss.finalCash
const flat = extractFinancials({ profitLoss: -500, finalCash: 200 });
ok("fin: profitLoss fallback к ss.profitLoss", flat.profitLoss === -500, flat.profitLoss);
ok("fin: finalCash fallback к ss.finalCash", flat.finalCash === 200, flat.finalCash);

// мусор → нули
const junk = extractFinancials({ snapshot: { cash: "x", day: null, dayEndSummary: { profitLoss: NaN } } });
ok("fin: нечисловые значения → 0", junk.finalCash === 0 && junk.daysCompleted === 0 && junk.profitLoss === 0, junk);

console.log(`\n===== CERT RULES: ${pass} passed, ${fail} failed =====`);
if (fails.length) { console.log("FAILED:"); for (const x of fails) console.log("  ✗ " + x); }
if (fail > 0) process.exit(1);
