// Единая дизайн-система токенов игрового поля.
// Раньше тема поля (ft) и семантические цвета были разбросаны inline по game.tsx.
// Теперь — единый источник: типографика, радиусы, тени, цвета, тема (light/dark).

export const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, 'Roboto Mono', monospace";

// Светлее/темнее базового цвета (p в [-1..1]) — для 3D-градиентов и оттенков.
export function shadeHex(hex: string, p: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + (p < 0 ? c * p : (255 - c) * p))));
  return '#' + ((1 << 24) + (adj(r) << 16) + (adj(g) << 8) + adj(b)).toString(16).slice(1);
}

// Семантические токены (тема-независимые).
export const TOKENS = {
  radius: { sm: 3, md: 5, lg: 8 },
  color: {
    success: '#22c55e',
    danger: '#dc2626',
    ripple: '#ffffff',
    cashPos: '#2a6478',
    cashNeg: '#7a1a1a',
  },
  shadow: {
    flashUp: '0 0 0 2px #4ade80, 0 0 14px rgba(34,197,94,0.55)',
    flashDown: '0 0 0 2px #f87171, 0 0 14px rgba(239,68,68,0.5)',
  },
} as const;

export interface FloorTheme {
  bg: string; text: string; textBright: string;
  demandBox: string; demandStroke: string; demandAccent: string;
  soldBox: string; soldStroke: string; colLabel: string;
  connLine: string; arrow: string; bufBox: string; bufStroke: string;
  rmBox: string; rmInner: string; rmStroke: string; rmBar: string;
  rmCounter: string; rmText: string; rmPrice: string;
  stationText: string; machineMarker: string; setupText: string;
  priceText: string; rowLabel: string; highlight: string; progressBar: string;
  flowLit: string; flowHalo: string;
}

// Тема поля: цех (тёмный) / бумага (светлый).
export function makeFloorTheme(floorDark: boolean): FloorTheme {
  return floorDark
    ? {
        bg: '#0d1b2a', text: '#8899aa', textBright: '#aabbcc',
        demandBox: '#1b2838', demandStroke: '#445566', demandAccent: '#00CED1',
        soldBox: '#1a2535', soldStroke: '#334455', colLabel: '#556677',
        connLine: '#334466', arrow: '#556', bufBox: '#1a2535', bufStroke: '#445566',
        rmBox: '#2a3a4a', rmInner: '#3d5a78', rmStroke: '#5a7a9a', rmBar: '#5a7a9a',
        rmCounter: '#1b2b3b', rmText: '#8ab4d8', rmPrice: '#667788',
        stationText: 'white', machineMarker: 'white', setupText: '#ffcc00',
        priceText: '#66aacc', rowLabel: '#445566', highlight: 'white', progressBar: 'white',
        flowLit: '#f5e09a', flowHalo: '#e8c84a',
      }
    : {
        bg: '#f7f4ec', text: '#5a6478', textBright: '#11192d',
        demandBox: '#ffffff', demandStroke: '#dcd5c4', demandAccent: '#11192d',
        soldBox: '#f0ebe0', soldStroke: '#dcd5c4', colLabel: '#5a6478',
        connLine: '#c0b9a4', arrow: '#5a6478', bufBox: '#ffffff', bufStroke: '#dcd5c4',
        rmBox: '#eae4d6', rmInner: '#dcd5c4', rmStroke: '#a8a25a', rmBar: '#a8a25a',
        rmCounter: '#eae4d6', rmText: '#11192d', rmPrice: '#5a6478',
        stationText: 'white', machineMarker: '#11192d', setupText: '#c87a4a',
        priceText: '#11192d', rowLabel: '#5a6478', highlight: '#11192d', progressBar: 'white',
        flowLit: '#b8860b', flowHalo: '#d4af37',
      };
}
