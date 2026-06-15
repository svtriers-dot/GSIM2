export type MachineColor = 'lightblue' | 'blue' | 'green' | 'pink' | 'brown';

export interface StationDef {
  id: string;
  col: string;
  row: number;
  color: MachineColor;
  processTime: number;
  isAssembly: boolean;
}

export interface ConnectionDef {
  from: string;
  to: string;
  inputSide?: 'left' | 'right';
}

export interface ProductDef {
  id: string;
  name: string;
  finalStation: string;
  price: number;
  weeklyDemand: number;
  rmCost: number;
}

export interface RawMaterialDef {
  id: string;
  col: string;
  cost: number;
  feedsStation: string;
}

export interface MachineTypeDef {
  color: MachineColor;
  count: number;
  setupTime: number;
  label: string;
}

export const FLOOR_WIDTH = 920;
export const FLOOR_HEIGHT = 720;

const CX: Record<string, number> = {
  A: 115, B: 240, C: 350, D: 480, E: 610, F: 740
};

const RY: Record<number, number> = {
  0: 650, 1: 580, 2: 510, 3: 435, 5: 340, 6: 270, 7: 200, 9: 100
};

export const STATIONS: StationDef[] = [
  { id: 'A1', col: 'A', row: 1, color: 'green', processTime: 4, isAssembly: false },
  { id: 'C1', col: 'C', row: 1, color: 'green', processTime: 5, isAssembly: false },
  { id: 'E1', col: 'E', row: 1, color: 'lightblue', processTime: 9, isAssembly: false },
  { id: 'F1', col: 'F', row: 1, color: 'green', processTime: 15, isAssembly: false },
  { id: 'E2', col: 'E', row: 2, color: 'pink', processTime: 18, isAssembly: false },
  { id: 'F2', col: 'F', row: 2, color: 'lightblue', processTime: 12, isAssembly: false },
  { id: 'B3', col: 'B', row: 3, color: 'brown', processTime: 8, isAssembly: true },
  { id: 'F3', col: 'F', row: 3, color: 'pink', processTime: 10, isAssembly: false },
  { id: 'A5', col: 'A', row: 5, color: 'green', processTime: 15, isAssembly: false },
  { id: 'C5', col: 'C', row: 5, color: 'blue', processTime: 6, isAssembly: false },
  { id: 'E5', col: 'E', row: 5, color: 'blue', processTime: 28, isAssembly: false },
  { id: 'F5', col: 'F', row: 5, color: 'blue', processTime: 14, isAssembly: false },
  { id: 'A6', col: 'A', row: 6, color: 'lightblue', processTime: 15, isAssembly: false },
  { id: 'A7', col: 'A', row: 7, color: 'pink', processTime: 20, isAssembly: false },
  { id: 'D7', col: 'D', row: 7, color: 'brown', processTime: 9, isAssembly: true },
  { id: 'F7', col: 'F', row: 7, color: 'pink', processTime: 7, isAssembly: false },
  { id: 'A9', col: 'A', row: 9, color: 'lightblue', processTime: 18, isAssembly: false },
  { id: 'D9', col: 'D', row: 9, color: 'lightblue', processTime: 6, isAssembly: false },
  { id: 'F9', col: 'F', row: 9, color: 'lightblue', processTime: 10, isAssembly: false },
];

export const CONNECTIONS: ConnectionDef[] = [
  { from: 'RM_A', to: 'A1' },
  { from: 'RM_C', to: 'C1' },
  { from: 'RM_E', to: 'E1' },
  { from: 'RM_F', to: 'F1' },
  { from: 'A1', to: 'B3', inputSide: 'left' },
  { from: 'C1', to: 'B3', inputSide: 'right' },
  { from: 'B3', to: 'A5' },
  { from: 'B3', to: 'C5' },
  { from: 'A5', to: 'A6' },
  { from: 'A6', to: 'A7' },
  { from: 'A7', to: 'A9' },
  { from: 'C5', to: 'D7', inputSide: 'left' },
  { from: 'E1', to: 'E2' },
  { from: 'E2', to: 'E5' },
  { from: 'E5', to: 'D7', inputSide: 'right' },
  { from: 'D7', to: 'D9' },
  { from: 'F1', to: 'F2' },
  { from: 'F2', to: 'F3' },
  { from: 'F3', to: 'F5' },
  { from: 'F5', to: 'F7' },
  { from: 'F7', to: 'F9' },
];

export const MACHINE_TYPES: MachineTypeDef[] = [
  { color: 'lightblue', count: 2, setupTime: 60, label: 'Голубой' },
  { color: 'blue', count: 1, setupTime: 15, label: 'Синий' },
  { color: 'green', count: 2, setupTime: 120, label: 'Зеленый' },
  { color: 'pink', count: 2, setupTime: 30, label: 'Розовый' },
  { color: 'brown', count: 1, setupTime: 0, label: 'Коричневый' },
];

export const PRODUCTS: ProductDef[] = [
  { id: 'A', name: 'Продукт A', finalStation: 'A9', price: 180, weeklyDemand: 40, rmCost: 40 },
  { id: 'D', name: 'Продукт D', finalStation: 'D9', price: 240, weeklyDemand: 50, rmCost: 60 },
  { id: 'F', name: 'Продукт F', finalStation: 'F9', price: 180, weeklyDemand: 40, rmCost: 20 },
];

export const RAW_MATERIALS: RawMaterialDef[] = [
  { id: 'RM_A', col: 'A', cost: 20, feedsStation: 'A1' },
  { id: 'RM_C', col: 'C', cost: 20, feedsStation: 'C1' },
  { id: 'RM_E', col: 'E', cost: 20, feedsStation: 'E1' },
  { id: 'RM_F', col: 'F', cost: 20, feedsStation: 'F1' },
];

export const GAME_CONSTANTS = {
  startingCash: 10000,
  fixedExpenses: 11000,
  dayDurationSeconds: 480,
  totalDays: 5,
  minutesPerWeek: 2400,
};

// V2: пресеты сложности — реальные параметры
export type GameConstants = typeof GAME_CONSTANTS;

export const SCENARIO_PRESETS: Record<string, Partial<GameConstants>> = {
  easy: {
    startingCash: 15000,
    fixedExpenses: 8000,
  },
  medium: {}, // дефолт
  hard: {
    startingCash: 7000,
    fixedExpenses: 14000,
  },
  custom: {}, // тренер задаёт сам
};

export function resolveGameConstants(
  preset: string | undefined,
  overrides: Partial<GameConstants> = {},
): GameConstants {
  const presetCfg = preset && preset in SCENARIO_PRESETS ? SCENARIO_PRESETS[preset] : {};
  return {
    ...GAME_CONSTANTS,
    ...presetCfg,
    ...overrides,
  };
}

export const COLOR_MAP: Record<MachineColor, { fill: string; stroke: string; bg: string }> = {
  lightblue: { fill: '#039BE5', stroke: '#01579B', bg: '#B3E5FC' },
  blue:      { fill: '#1A237E', stroke: '#0D1B5C', bg: '#9FA8DA' },
  green:     { fill: '#2E7D32', stroke: '#1B5E20', bg: '#A5D6A7' },
  pink:      { fill: '#C2185B', stroke: '#880E4F', bg: '#F8BBD0' },
  brown:     { fill: '#5D4037', stroke: '#3E2723', bg: '#BCAAA4' },
};

export function getStationPos(stationId: string): { x: number; y: number } {
  if (stationId.startsWith('RM_')) {
    const col = stationId.replace('RM_', '');
    return { x: CX[col] || 0, y: RY[0] };
  }
  const station = STATIONS.find(s => s.id === stationId);
  if (!station) return { x: 0, y: 0 };
  return { x: CX[station.col] || 0, y: RY[station.row] || 0 };
}

export function getDemandPos(productId: string): { x: number; y: number } {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return { x: 0, y: 0 };
  const station = STATIONS.find(s => s.id === product.finalStation);
  if (!station) return { x: 0, y: 0 };
  return { x: CX[station.col] || 0, y: 40 };
}

export function getStationInputs(stationId: string): { type: 'single' | 'assembly'; sources: string[] } {
  const station = STATIONS.find(s => s.id === stationId);
  if (!station) return { type: 'single', sources: [] };

  const incoming = CONNECTIONS.filter(c => c.to === stationId);
  if (station.isAssembly) {
    const left = incoming.find(c => c.inputSide === 'left');
    const right = incoming.find(c => c.inputSide === 'right');
    return { type: 'assembly', sources: [left?.from || '', right?.from || ''] };
  }
  return { type: 'single', sources: incoming.map(c => c.from) };
}

export function getStationOutputs(stationId: string): string[] {
  return CONNECTIONS.filter(c => c.from === stationId).map(c => c.to);
}

export function getProductForStation(stationId: string): ProductDef | undefined {
  return PRODUCTS.find(p => p.finalStation === stationId);
}


// Helper для UI — возвращает все ID станков (для кнопок forced events)
export function getAllMachineIds(): string[] {
  const ids: string[] = [];
  for (const mt of MACHINE_TYPES) {
    for (let i = 0; i < mt.count; i++) {
      ids.push(`m_${mt.color}_${i}`);
    }
  }
  return ids;
}

// Helper — список ID продуктов
export function getAllProductIds(): string[] {
  return PRODUCTS.map((p) => p.id);
}

// Человекочитаемая метка станка по id формата m_<color>_<i> -> «Голубой #1»
export function getMachineLabel(machineId: string): string {
  const m = /^m_([a-z]+)_(\d+)$/.exec(machineId || "");
  if (!m) return machineId || "станок";
  const color = m[1] as MachineColor;
  const idx = parseInt(m[2], 10);
  const mt = MACHINE_TYPES.find((t) => t.color === color);
  const label = mt?.label ?? color;
  return (mt?.count ?? 1) > 1 ? `${label} #${idx + 1}` : label;
}
