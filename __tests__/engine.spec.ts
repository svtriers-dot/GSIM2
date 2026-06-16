import { GoldrattEngine } from "../client/src/lib/gameEngine";
import {
  getAllMachineIds, GAME_CONSTANTS, STATIONS, PRODUCTS, MACHINE_TYPES, RAW_MATERIALS,
} from "../client/src/lib/gameConfig";

let pass = 0, fail = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, info?: any) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (info !== undefined ? `  [${JSON.stringify(info)}]` : "")); }
}
// прогнать движок на T игровых секунд маленькими тиками (dt=0.1, pace=1)
function run(e: GoldrattEngine, seconds: number) {
  e.running = true;
  const step = 0.1; let t = 0;
  while (t < seconds) { e.tick(step); t += step; if (e.dayEndSummary || e.gameOver) break; }
}

// ---------- 1. ИНИЦИАЛИЗАЦИЯ ----------
{
  const e = new GoldrattEngine();
  const expectedMachines = MACHINE_TYPES.reduce((s, m) => s + m.count, 0);
  ok("init: число станков = сумма count", e.machines.length === expectedMachines, e.machines.length);
  ok("init: id станков формата m_<color>_<i>", e.machines.every(m => /^m_[a-z]+_\d+$/.test(m.id)));
  ok("init: id движка == getAllMachineIds (КРИТично для поломок)",
     JSON.stringify(e.machines.map(m=>m.id).sort()) === JSON.stringify(getAllMachineIds().sort()));
  ok("init: cash = startingCash", e.cash === GAME_CONSTANTS.startingCash, e.cash);
  ok("init: fixedExpenses", e.fixedExpenses === GAME_CONSTANTS.fixedExpenses, e.fixedExpenses);
  ok("init: спрос = weeklyDemand", PRODUCTS.every(p => e.demandRemaining[p.id] === p.weeklyDemand));
  ok("init: стартовые буферы B3_shared=25", e.buffers["B3_shared"] === 25, e.buffers["B3_shared"]);
}

// ---------- 2. ЗАКУПКА СЫРЬЯ ----------
{
  const e = new GoldrattEngine();
  const rm = RAW_MATERIALS[0];
  const before = e.cash;
  const r = e.buyRawMaterial(rm.id, 5);
  ok("buyRM: success", r.success);
  ok("buyRM: cash уменьшилась", e.cash === before - rm.cost*5, e.cash);
  ok("buyRM: буфер пополнен", e.buffers[rm.id] === 5);
  ok("buyRM: totalRMCost учтён", e.totalRMCost === rm.cost*5);
  ok("buyRM: qty<=0 отклонено", !e.buyRawMaterial(rm.id, 0).success);
  ok("buyRM: неизвестное сырьё отклонено", !e.buyRawMaterial("RM_X", 1).success);
  const e2 = new GoldrattEngine(); 
  ok("buyRM: нехватка средств отклонена", !e2.buyRawMaterial(rm.id, 999999).success);
}

// ---------- 3. РАЗМЕЩЕНИЕ СТАНКА ----------
{
  const e = new GoldrattEngine();
  const a1 = STATIONS.find(s=>s.id==="A1")!; // green
  const green = e.machines.find(m=>m.color===a1.color)!;
  const wrong = e.machines.find(m=>m.color!==a1.color)!;
  ok("place: неверный цвет отклонён", !e.placeMachine(wrong.id, "A1").success);
  const r = e.placeMachine(green.id, "A1");
  ok("place: верный цвет ок", r.success);
  ok("place: setupTime>0 => статус setup", e.stationStates["A1"].status === (green.setupTime>0?"setup":"idle"));
  ok("place: machine.assignedTo выставлен", green.assignedTo === "A1");
  // занятая позиция другим станком
  const green2 = e.machines.find(m=>m.color===a1.color && m.id!==green.id);
  if (green2) ok("place: занятая позиция отклонена", !e.placeMachine(green2.id, "A1").success);
  // brown setup=0 => idle сразу
  const brownStation = STATIONS.find(s=>s.color==="brown" && !s.isAssembly) || STATIONS.find(s=>s.color==="brown");
  const brown = e.machines.find(m=>m.color==="brown")!;
  if (brownStation) { e.placeMachine(brown.id, brownStation.id);
    ok("place: brown setup=0 => idle сразу", e.stationStates[brownStation.id].status==="idle"); }
}

// ---------- 4. SETUP -> PRODUCTION -> OUTPUT ----------
{
  const e = new GoldrattEngine();
  // C1 green, processTime 5, вход RM_C. setup green=120
  const c1 = STATIONS.find(s=>s.id==="C1")!;
  const green = e.machines.find(m=>m.color==="green")!;
  e.placeMachine(green.id, "C1");
  e.buyRawMaterial("RM_C", 3);
  const setup = green.setupTime; // 120
  run(e, setup + 0.5); // пройти setup
  ok("setup: завершился (idle/prod)", e.stationStates["C1"].status !== "setup", e.stationStates["C1"].status);
  const outBefore = e.buffers["C1_out"];
  run(e, c1.processTime + 0.5);
  ok("prod: входной буфер RM_C уменьшился", e.buffers["RM_C"] < 3, e.buffers["RM_C"]);
  ok("prod: выходной буфер C1_out пополнен", e.buffers["C1_out"] > outBefore, e.buffers["C1_out"]);
}

// ---------- 5. ПРОДАЖА на финальной станции ----------
{
  const e = new GoldrattEngine();
  // F-цепочка: финальная станция F9 (product F). Проще: продукт A финал A9.
  // Возьмём продукт через прямой буфер: положим товар в входной буфер финальной станции и прогоним.
  const prod = PRODUCTS.find(p=>p.id==="A")!; // finalStation A9
  const a9 = STATIONS.find(s=>s.id===prod.finalStation)!; // lightblue
  const m = e.machines.find(mm=>mm.color===a9.color)!;
  e.placeMachine(m.id, a9.id);
  // вход A9 = A7_out. Накинем туда товары напрямую
  e.buffers["A7_out"] = 5;
  const cashBefore = e.cash, demBefore = e.demandRemaining["A"], soldBefore = e.sold["A"];
  run(e, m.setupTime + a9.processTime + 1);
  ok("sale: касса выросла на цену", e.cash >= cashBefore + prod.price, {cash:e.cash, before:cashBefore});
  ok("sale: demandRemaining уменьшился", e.demandRemaining["A"] === demBefore - (e.sold["A"]-soldBefore), {dem:e.demandRemaining["A"]});
  ok("sale: sold увеличился", e.sold["A"] > soldBefore, e.sold["A"]);
  ok("sale: totalRevenue учтён", e.totalRevenue >= prod.price);
}

// ---------- 6. PACE (темп) ----------
{
  const e = new GoldrattEngine();
  ok("pace: clamp >10 => 10", (e.setPace(50), e.pace===10), e.pace);
  ok("pace: clamp <1 => 1", (e.setPace(0), e.pace===1), e.pace);
  const e2 = new GoldrattEngine(); e2.setPace(10); e2.running=true;
  const t0 = e2.timeInDay; e2.tick(1); 
  ok("pace: gameDt = dt*pace", Math.abs((e2.timeInDay - t0) - 10) < 1e-9, e2.timeInDay);
}

// ---------- 7. КОНЕЦ ДНЯ / СМЕНЫ ----------
{
  const e = new GoldrattEngine(); e.running = true;
  e.tick(GAME_CONSTANTS.dayDurationSeconds + 1); // переполнить день
  ok("endDay: dayEndSummary создан", !!e.dayEndSummary);
  ok("endDay: running=false", e.running===false);
  ok("endDay: day=1 ещё не инкрементнут", e.day===1, e.day);
  e.dismissDaySummary();
  ok("dismiss: day++ ", e.day===2, e.day);
  ok("dismiss: timeInDay сброшен", e.timeInDay===0);
  // дойти до последнего дня
  const e3 = new GoldrattEngine();
  for (let d=0; d<GAME_CONSTANTS.totalDays; d++){ e3.running=true; e3.tick(GAME_CONSTANTS.dayDurationSeconds+1); if(d<GAME_CONSTANTS.totalDays-1) e3.dismissDaySummary(); }
  ok("lastDay: gameOver=true", e3.gameOver===true, {day:e3.day, over:e3.gameOver});
  ok("lastDay: fixedExpenses списаны (cash уменьшилась на fixedExpenses в конце)", true); // проверим отдельно ниже
}

// ---------- 7b. fixedExpenses списываются один раз в конце ----------
{
  const e = new GoldrattEngine();
  const startCash = e.cash;
  for (let d=0; d<GAME_CONSTANTS.totalDays; d++){ e.running=true; e.tick(GAME_CONSTANTS.dayDurationSeconds+1); if(d<GAME_CONSTANTS.totalDays-1) e.dismissDaySummary(); }
  ok("fixedExpenses: cash в конце = старт - fixedExpenses (без продаж)", e.cash === startCash - GAME_CONSTANTS.fixedExpenses, {cash:e.cash, exp:startCash-GAME_CONSTANTS.fixedExpenses});
}

// ---------- 8. FORCED: поломка ----------
{
  const e = new GoldrattEngine();
  const c1m = e.machines.find(m=>m.color==="green")!;
  e.placeMachine(c1m.id, "C1"); e.buyRawMaterial("RM_C", 3);
  run(e, c1m.setupTime + 0.5); // завершить setup -> idle
  // Поломка измеряется в ИГРОВОМ времени: 30 игровых секунд (а не wall-clock).
  ok("breakdown: applyMachineBreakdown по валидному id = true", e.applyMachineBreakdown(c1m.id, 30000)===true);
  ok("breakdown: невалидный id = false", e.applyMachineBreakdown("machine_999", 1000)===false);
  ok("breakdown: остаток выставлен в игровых мс", c1m.brokenRemainingMs===30000, c1m.brokenRemainingMs);
  const outBefore = e.buffers["C1_out"]; const rmBefore = e.buffers["RM_C"];
  run(e, 20); // 20с < 30с — станок ещё сломан
  ok("breakdown: пока сломан — производство НЕ идёт", e.buffers["C1_out"]===outBefore, e.buffers["C1_out"]);
  ok("breakdown: пока сломан — вход НЕ потребляется", e.buffers["RM_C"]===rmBefore, e.buffers["RM_C"]);
  ok("breakdown: остаток ещё положителен (~10с)", (c1m.brokenRemainingMs ?? 0) > 0, c1m.brokenRemainingMs);
  run(e, 15); // суммарно 35с > 30с — поломка снимается игровым временем
  ok("breakdown: снят по игровому времени", c1m.brokenRemainingMs===undefined, c1m.brokenRemainingMs);
  run(e, e.stationStates["C1"].processRemaining + c1m.setupTime + 1);
  ok("breakdown: после восстановления производит", e.buffers["C1_out"] > outBefore, e.buffers["C1_out"]);
}

// ---------- 9. FORCED: спрос ----------
{
  const e = new GoldrattEngine();
  const before = e.demandRemaining["A"];
  e.applyDemandMultiplier("A", 2, 100000);
  ok("demand spike x2: demandRemaining удвоился", e.demandRemaining["A"] === before*2, e.demandRemaining["A"]);
  e.applyDemandMultiplier("A", 0.5, 100000);
  ok("demand drop x0.5: demandRemaining уполовинен", e.demandRemaining["A"] === Math.round(before*2*0.5), e.demandRemaining["A"]);
}

// ---------- 10. FORCED: рост расходов ----------
{
  const e = new GoldrattEngine();
  const base = e.fixedExpenses;
  e.applyWageIncrease(20);
  ok("wage +20%", e.fixedExpenses === Math.round(base*1.2), e.fixedExpenses);
}

// ---------- 11. removeMachine / reset ----------
{
  const e = new GoldrattEngine();
  const m = e.machines.find(mm=>mm.color==="green")!;
  e.placeMachine(m.id, "C1");
  e.removeMachine(m.id);
  ok("remove: assignedTo=null", m.assignedTo===null);
  ok("remove: станция empty", e.stationStates["C1"].status==="empty");
  e.placeMachine(m.id,"C1"); e.buyRawMaterial("RM_C",2); e.cash=555;
  e.resetGame();
  ok("reset: cash восстановлен", e.cash===GAME_CONSTANTS.startingCash, e.cash);
  ok("reset: станки сняты", e.machines.every(mm=>mm.assignedTo===null));
  ok("reset: спрос восстановлен", e.demandRemaining["A"]===PRODUCTS.find(p=>p.id==="A")!.weeklyDemand);
}

// ---------- 12. getMetrics / bottleneck ----------
{
  const e = new GoldrattEngine();
  // создадим очередь: положим много в буфер перед станцией, проверим bottleneck
  e.buffers["A1_out"] = 30;
  const m = e.getMetrics();
  ok("metrics: shape ок", typeof m.cash==="number" && typeof m.inventory==="number");
  ok("metrics: inventory = сумма буферов", m.inventory === Object.values(e.buffers).reduce((a,b)=>a+b,0), m.inventory);
  // bottleneck: ожидаем НЕ null если есть очередь у активной станции
  ok("metrics: bottleneck определяется при наличии очереди", m.bottleneckStationId !== null, {bottleneck:m.bottleneckStationId});
  ok("metrics: bottleneckQueue = глубина очереди перед узким местом", m.bottleneckQueue === 30, {q:m.bottleneckQueue, st:m.bottleneckStationId});
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
if (fails.length) { console.log("FAILED:"); for (const f of fails) console.log("  ✗ " + f); }

// Ненулевой код выхода при провале — чтобы годилось для CI
if (fail > 0) process.exit(1);
