import { customAlphabet } from "nanoid";

// Без 0/O/I/1/L — чтобы не путать на проекторе
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(ALPHABET, 6);

export function generateAccessCode(): string {
  return generate();
}

const COLORS = [
  "#1f6feb", // blue
  "#238636", // green
  "#9e5cf7", // purple
  "#db61a2", // pink
  "#bf8700", // amber
  "#cf222e", // red
  "#0969da", // sky
  "#1a7f37", // moss
  "#8250df", // violet
  "#a40e26", // crimson
  "#bc4c00", // orange
  "#0550ae", // navy
];

export function pickTeamColor(usedColors: string[]): string {
  const free = COLORS.find((c) => !usedColors.includes(c));
  return free || COLORS[Math.floor(Math.random() * COLORS.length)];
}
