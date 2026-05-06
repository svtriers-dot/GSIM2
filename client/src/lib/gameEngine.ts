import {
  type MachineColor,
  STATIONS,
  CONNECTIONS,
  MACHINE_TYPES,
  PRODUCTS,
  RAW_MATERIALS,
  GAME_CONSTANTS,
  getStationInputs,
  getProductForStation,
} from './gameConfig';

export interface MachineState {
  id: string;
  color: MachineColor;
  setupTime: number;
  assignedTo: string | null;
  status: 'idle' | 'setup' | 'prod';
  setupRemaining: number;
}

export interface StationRuntimeState {
  machineId: string | null;
  status: 'empty' | 'setup' | 'idle' | 'prod';
  processRemaining: number;
  setupRemaining: number;
}

export interface MachineUtilization {
  machineId: string;
  color: MachineColor;
  assignedTo: string | null;
  workPercent: number;
}

export interface ColorUtilization {
  color: MachineColor;
  label: string;
  count: number;
  workPercent: number;
}

export interface DayEndSummary {
  day: number;
  revenue: number;
  rmCost: number;
  productsSold: Record<string, number>;
  cashAtEnd: number;
  machineUtilization: MachineUtilization[];
  dailyColorUtilization: ColorUtilization[];
  colorUtilization: ColorUtilization[];
  throughput: number;
  profitLoss: number;
}

export interface GameSnapshot {
  running: boolean;
  pace: number;
  week: number;
  day: number;
  timeInDay: number;
  cash: number;
  fixedExpenses: number;
  buffers: Record<string, number>;
  machines: MachineState[];
  stationStates: Record<string, StationRuntimeState>;
  sold: Record<string, number>;
  demandRemaining: Record<string, number>;
  dailyRevenue: number;
  dailyRMCost: number;
  gameOver: boolean;
  dayEndSummary: DayEndSummary | null;
  totalRevenue: number;
  totalRMCost: number;
}

// MVP-2: краткий срез для тренерского live-дашборда (отправляется каждые 2с по WS)
export interface SessionMetrics {
  cash: number;
  throughput: number;          // totalRevenue - totalRMCost (рублей за всю игру)
  inventory: number;           // суммарный WIP во всех буферах
  operatingExpense: number;    // totalRMCost (затраты на сырьё, аналог OE)
  bottleneckStationId: string | null;  // самая загруженная станция с очередью
  day: number;
  timeInDay: number;
  running: boolean;
  gameOver: boolean;
}

export class GoldrattEngine {
  running = false;
  pace = 1;
  week = 1;
  day = 1;
  timeInDay = 0;
  cash: number;
  fixedExpenses: number;
  buffers: Record<string, number> = {};
  machines: MachineState[] = [];
  stationStates: Record<string, StationRuntimeState> = {};
  sold: Record<string, number> = {};
  demandRemaining: Record<string, number> = {};
  dailyRevenue = 0;
  dailyRMCost = 0;
  totalRevenue = 0;
  totalRMCost = 0;
  gameOver = false;
  dayEndSummary: DayEndSummary | null = null;
  machineWorkTime: Record<string, number> = {};
  weeklyMachineWorkTime: Record<string, number> = {};

  constructor() {
    this.cash = GAME_CONSTANTS.startingCash;
    this.fixedExpenses = GAME_CONSTANTS.fixedExpenses;
    this.initMachines();
    this.initStations();
    this.initBuffers();
    this.initDemand();
  }

  private initMachines() {
    let idx = 0;
    for (const mt of MACHINE_TYPES) {
      for (let i = 0; i < mt.count; i++) {
        this.machines.push({
          id: `machine_${idx}`,
          color: mt.color,
          setupTime: mt.setupTime,
          assignedTo: null,
          status: 'idle',
          setupRemaining: 0,
        });
        idx++;
      }
    }
  }

  private initStations() {
    for (const s of STATIONS) {
      this.stationStates[s.id] = {
        machineId: null,
        status: 'empty',
        processRemaining: 0,
        setupRemaining: 0,
      };
    }
  }

  private initBuffers() {
    for (const rm of RAW_MATERIALS) {
      this.buffers[rm.id] = 0;
    }
    for (const s of STATIONS) {
      this.buffers[`${s.id}_out`] = 0;
    }
    this.buffers['B3_shared'] = 0;

    this.buffers['B3_shared'] = 25;
    this.buffers['E2_out'] = 15;
    this.buffers['F3_out'] = 10;
  }

  private initDemand() {
    for (const p of PRODUCTS) {
      this.sold[p.id] = 0;
      this.demandRemaining[p.id] = p.weeklyDemand;
    }
  }

  private getInputBufferId(stationId: string): string {
    const inputs = getStationInputs(stationId);
    if (inputs.sources.length === 0) return '';

    if (inputs.type === 'single') {
      const src = inputs.sources[0];
      if (src.startsWith('RM_')) return src;
      if (src === 'B3' && (stationId === 'A5' || stationId === 'C5')) return 'B3_shared';
      return `${src}_out`;
    }
    return '';
  }

  private getLeftBufferId(stationId: string): string {
    const conns = CONNECTIONS.filter(c => c.to === stationId && c.inputSide === 'left');
    if (conns.length === 0) return '';
    const src = conns[0].from;
    if (src === 'B3') return 'B3_shared';
    return `${src}_out`;
  }

  private getRightBufferId(stationId: string): string {
    const conns = CONNECTIONS.filter(c => c.to === stationId && c.inputSide === 'right');
    if (conns.length === 0) return '';
    const src = conns[0].from;
    return `${src}_out`;
  }

  private getOutputBufferId(stationId: string): string {
    if (stationId === 'B3') return 'B3_shared';
    return `${stationId}_out`;
  }

  tick(dt: number) {
    if (!this.running || this.gameOver) return;

    const gameDt = dt * this.pace;
    this.timeInDay += gameDt;

    if (this.timeInDay >= GAME_CONSTANTS.dayDurationSeconds) {
      this.timeInDay = GAME_CONSTANTS.dayDurationSeconds;
      this.endDay();
      return;
    }

    for (const m of this.machines) {
      if (m.assignedTo && m.status === 'prod') {
        this.machineWorkTime[m.id] = (this.machineWorkTime[m.id] || 0) + gameDt;
      }
    }

    const sortedStations = [...STATIONS].sort((a, b) => b.row - a.row);

    for (const stationDef of sortedStations) {
      const state = this.stationStates[stationDef.id];
      if (!state.machineId) continue;

      if (state.status === 'setup') {
        state.setupRemaining -= gameDt;
        if (state.setupRemaining <= 0) {
          state.setupRemaining = 0;
          state.status = 'idle';
          const machine = this.machines.find(m => m.id === state.machineId);
          if (machine) {
            machine.status = 'idle';
            machine.setupRemaining = 0;
          }
        }
        continue;
      }

      if (state.status === 'prod') {
        state.processRemaining -= gameDt;
        if (state.processRemaining <= 0) {
          state.processRemaining = 0;
          state.status = 'idle';
          const machine = this.machines.find(m => m.id === state.machineId);
          if (machine) machine.status = 'idle';

          const product = getProductForStation(stationDef.id);
          if (product) {
            if (this.demandRemaining[product.id] > 0) {
              this.cash += product.price;
              this.sold[product.id]++;
              this.demandRemaining[product.id]--;
              this.dailyRevenue += product.price;
              this.totalRevenue += product.price;
            }
          } else {
            const outBuf = this.getOutputBufferId(stationDef.id);
            if (outBuf) {
              this.buffers[outBuf] = (this.buffers[outBuf] || 0) + 1;
            }
          }
        }
        continue;
      }

      if (state.status === 'idle') {
        if (stationDef.isAssembly) {
          const leftBuf = this.getLeftBufferId(stationDef.id);
          const rightBuf = this.getRightBufferId(stationDef.id);
          if (leftBuf && rightBuf && (this.buffers[leftBuf] || 0) > 0 && (this.buffers[rightBuf] || 0) > 0) {
            this.buffers[leftBuf]--;
            this.buffers[rightBuf]--;
            state.status = 'prod';
            state.processRemaining = stationDef.processTime;
            const machine = this.machines.find(m => m.id === state.machineId);
            if (machine) machine.status = 'prod';
          }
        } else {
          const inputBuf = this.getInputBufferId(stationDef.id);
          if (inputBuf && (this.buffers[inputBuf] || 0) > 0) {
            this.buffers[inputBuf]--;
            state.status = 'prod';
            state.processRemaining = stationDef.processTime;
            const machine = this.machines.find(m => m.id === state.machineId);
            if (machine) machine.status = 'prod';
          }
        }
      }
    }
  }

  private endDay() {
    this.running = false;
    const dayDuration = GAME_CONSTANTS.dayDurationSeconds;
    const utilization: MachineUtilization[] = this.machines.map(m => ({
      machineId: m.id,
      color: m.color,
      assignedTo: m.assignedTo,
      workPercent: m.assignedTo
        ? Math.min(100, Math.round(((this.machineWorkTime[m.id] || 0) / dayDuration) * 100))
        : 0,
    }));

    const dailyColorUtil: ColorUtilization[] = MACHINE_TYPES.map(mt => {
      const machinesOfColor = this.machines.filter(m => m.color === mt.color);
      const totalAvailable = mt.count * dayDuration;
      const totalWorked = machinesOfColor.reduce((sum, m) => sum + (this.machineWorkTime[m.id] || 0), 0);
      return {
        color: mt.color,
        label: mt.label,
        count: mt.count,
        workPercent: totalAvailable > 0 ? Math.min(100, Math.round((totalWorked / totalAvailable) * 100)) : 0,
      };
    });

    for (const m of this.machines) {
      this.weeklyMachineWorkTime[m.id] = (this.weeklyMachineWorkTime[m.id] || 0) + (this.machineWorkTime[m.id] || 0);
    }

    const colorUtil: ColorUtilization[] = MACHINE_TYPES.map(mt => {
      const machinesOfColor = this.machines.filter(m => m.color === mt.color);
      const totalAvailable = mt.count * dayDuration * this.day;
      const totalWorked = machinesOfColor.reduce((sum, m) => sum + (this.weeklyMachineWorkTime[m.id] || 0), 0);
      return {
        color: mt.color,
        label: mt.label,
        count: mt.count,
        workPercent: totalAvailable > 0 ? Math.min(100, Math.round((totalWorked / totalAvailable) * 100)) : 0,
      };
    });

    const throughput = this.totalRevenue - this.totalRMCost;

    const isLastDay = this.day >= GAME_CONSTANTS.totalDays;
    const profitLoss = isLastDay ? throughput - this.fixedExpenses : throughput;

    this.dayEndSummary = {
      day: this.day,
      revenue: this.dailyRevenue,
      rmCost: this.dailyRMCost,
      productsSold: { ...this.sold },
      cashAtEnd: this.cash,
      machineUtilization: utilization,
      dailyColorUtilization: dailyColorUtil,
      colorUtilization: colorUtil,
      throughput,
      profitLoss,
    };

    if (isLastDay) {
      this.cash -= this.fixedExpenses;
      this.gameOver = true;
    }
  }

  dismissDaySummary() {
    if (!this.dayEndSummary) return;
    if (this.gameOver) return;
    this.dayEndSummary = null;
    this.day++;
    this.timeInDay = 0;
    this.dailyRevenue = 0;
    this.dailyRMCost = 0;
    this.machineWorkTime = {};
  }

  buyRawMaterial(rmId: string, qty: number): { success: boolean; message: string } {
    const rm = RAW_MATERIALS.find(r => r.id === rmId);
    if (!rm) return { success: false, message: 'Сырье не найдено' };
    const totalCost = rm.cost * qty;
    if (totalCost > this.cash) return { success: false, message: 'Недостаточно средств' };
    if (qty <= 0) return { success: false, message: 'Неверное количество' };
    this.cash -= totalCost;
    this.dailyRMCost += totalCost;
    this.totalRMCost += totalCost;
    this.buffers[rmId] = (this.buffers[rmId] || 0) + qty;
    return { success: true, message: `Закуплено ${qty} ед. за ${totalCost}₽` };
  }

  placeMachine(machineId: string, stationId: string): { success: boolean; message: string } {
    const machine = this.machines.find(m => m.id === machineId);
    if (!machine) return { success: false, message: 'Станок не найден' };

    const stationDef = STATIONS.find(s => s.id === stationId);
    if (!stationDef) return { success: false, message: 'Позиция не найдена' };

    if (stationDef.color !== machine.color) {
      return { success: false, message: `Станок ${machine.color} нельзя установить на ${stationDef.color} позицию` };
    }

    const currentStation = this.stationStates[stationId];
    if (currentStation.machineId && currentStation.machineId !== machineId) {
      return { success: false, message: 'На этой позиции уже стоит другой станок' };
    }

    if (machine.assignedTo && machine.assignedTo !== stationId) {
      const prevStation = this.stationStates[machine.assignedTo];
      if (prevStation) {
        prevStation.machineId = null;
        prevStation.status = 'empty';
        prevStation.processRemaining = 0;
        prevStation.setupRemaining = 0;
      }
    }

    machine.assignedTo = stationId;
    currentStation.machineId = machineId;

    if (machine.setupTime > 0) {
      currentStation.status = 'setup';
      currentStation.setupRemaining = machine.setupTime;
      machine.status = 'setup';
      machine.setupRemaining = machine.setupTime;
    } else {
      currentStation.status = 'idle';
      machine.status = 'idle';
    }

    return { success: true, message: `Станок установлен на ${stationId}` };
  }

  removeMachine(machineId: string) {
    const machine = this.machines.find(m => m.id === machineId);
    if (!machine || !machine.assignedTo) return;

    const station = this.stationStates[machine.assignedTo];
    if (station) {
      station.machineId = null;
      station.status = 'empty';
      station.processRemaining = 0;
      station.setupRemaining = 0;
    }

    machine.assignedTo = null;
    machine.status = 'idle';
    machine.setupRemaining = 0;
  }

  toggleRunning() {
    if (this.gameOver) return;
    if (this.dayEndSummary) return;
    this.running = !this.running;
  }

  setPace(pace: number) {
    this.pace = Math.max(1, Math.min(pace, 10));
  }

  resetGame() {
    this.running = false;
    this.pace = 1;
    this.week = 1;
    this.day = 1;
    this.timeInDay = 0;
    this.cash = GAME_CONSTANTS.startingCash;
    this.dailyRevenue = 0;
    this.dailyRMCost = 0;
    this.totalRevenue = 0;
    this.totalRMCost = 0;
    this.gameOver = false;
    this.dayEndSummary = null;
    this.machineWorkTime = {};
    this.weeklyMachineWorkTime = {};
    this.machines.forEach(m => {
      m.assignedTo = null;
      m.status = 'idle';
      m.setupRemaining = 0;
    });
    this.initStations();
    this.initBuffers();
    this.initDemand();
  }

  getSnapshot(): GameSnapshot {
    return {
      running: this.running,
      pace: this.pace,
      week: this.week,
      day: this.day,
      timeInDay: this.timeInDay,
      cash: this.cash,
      fixedExpenses: this.fixedExpenses,
      buffers: { ...this.buffers },
      machines: this.machines.map(m => ({ ...m })),
      stationStates: Object.fromEntries(
        Object.entries(this.stationStates).map(([k, v]) => [k, { ...v }])
      ),
      sold: { ...this.sold },
      demandRemaining: { ...this.demandRemaining },
      dailyRevenue: this.dailyRevenue,
      dailyRMCost: this.dailyRMCost,
      gameOver: this.gameOver,
      dayEndSummary: this.dayEndSummary ? { ...this.dayEndSummary } : null,
      totalRevenue: this.totalRevenue,
      totalRMCost: this.totalRMCost,
    };
  }

  // MVP-2: краткий срез для тренерского дашборда
  getMetrics(): SessionMetrics {
    // Inventory = сумма всех буферов
    let inventory = 0;
    for (const v of Object.values(this.buffers)) inventory += v;

    // Bottleneck: станция с непустой очередью (буфером перед ней) И с самой высокой загрузкой
    // Простая эвристика: ищем станцию с самым большим буфером before-process среди занятых
    let bottleneckStationId: string | null = null;
    let maxQueue = 0;
    for (const [stationId, st] of Object.entries(this.stationStates)) {
      // буфер для этой станции — bufferKey совпадает с stationId
      const queue = this.buffers[stationId] || 0;
      if (queue > maxQueue && (st.status === 'prod' || st.status === 'setup' || st.status === 'idle')) {
        maxQueue = queue;
        bottleneckStationId = stationId;
      }
    }

    return {
      cash: Math.round(this.cash),
      throughput: Math.round(this.totalRevenue - this.totalRMCost),
      inventory,
      operatingExpense: Math.round(this.totalRMCost),
      bottleneckStationId,
      day: this.day,
      timeInDay: this.timeInDay,
      running: this.running,
      gameOver: this.gameOver,
    };
  }
}
