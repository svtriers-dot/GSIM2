// Единый рендерер сертификата (canvas → PNG). Используется И участником (в игре),
// И тренером (в кабинете), чтобы сертификаты были идентичными и всегда на «один лист».

import { PRODUCTS } from "./gameConfig";

export interface CertificateRenderData {
  name: string;
  totalRevenue: number;
  totalRMCost: number;
  fixedExpenses: number;
  finalCash: number;
  throughput: number;
  profitLoss: number;
  sold: Record<string, number>;
  date?: Date;
}

export function renderCertificateDataUrl(d: CertificateRenderData): string | null {
  const W = 1400, H = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#fdfcfa');
  bgGrad.addColorStop(0.5, '#f8f5f0');
  bgGrad.addColorStop(1, '#f5f0e8');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const drawCornerOrnament = (cx: number, cy: number, flipX: number, flipY: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(60, 0);
    ctx.moveTo(0, 0); ctx.lineTo(0, 60);
    ctx.stroke();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(12, 12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const M = 40;
  ctx.strokeStyle = '#1a3c5e';
  ctx.lineWidth = 3;
  ctx.strokeRect(M, M, W - M * 2, H - M * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1;
  ctx.strokeRect(M + 8, M + 8, W - M * 2 - 16, H - M * 2 - 16);
  ctx.strokeRect(M + 12, M + 12, W - M * 2 - 24, H - M * 2 - 24);

  drawCornerOrnament(M + 14, M + 14, 1, 1);
  drawCornerOrnament(W - M - 14, M + 14, -1, 1);
  drawCornerOrnament(M + 14, H - M - 14, 1, -1);
  drawCornerOrnament(W - M - 14, H - M - 14, -1, -1);

  const headerGrad = ctx.createLinearGradient(0, 80, 0, 135);
  headerGrad.addColorStop(0, '#0f2b47');
  headerGrad.addColorStop(1, '#1a4a7a');
  ctx.fillStyle = headerGrad;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '8px';
  ctx.fillText('СЕРТИФИКАТ', W / 2, 130);
  ctx.letterSpacing = '0px';

  const lineW = 260;
  const lineGrad = ctx.createLinearGradient(W / 2 - lineW, 0, W / 2 + lineW, 0);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.2, '#d4af37');
  lineGrad.addColorStop(0.5, '#e8c84a');
  lineGrad.addColorStop(0.8, '#d4af37');
  lineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(W / 2 - lineW, 148, lineW * 2, 2);

  ctx.fillStyle = '#5a6a7a';
  ctx.font = 'italic 19px Georgia, serif';
  ctx.fillText('об успешном прохождении симулятора производства', W / 2, 182);
  ctx.fillText('по Теории ограничений', W / 2, 208);

  ctx.fillStyle = '#6a7a8a';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Настоящим подтверждается, что', W / 2, 258);

  const nameGrad = ctx.createLinearGradient(0, 280, 0, 340);
  nameGrad.addColorStop(0, '#0f2b47');
  nameGrad.addColorStop(1, '#1a4a7a');
  ctx.fillStyle = nameGrad;
  ctx.font = 'bold 32px Georgia, serif';
  const nameY = 305;
  ctx.fillText(d.name, W / 2, nameY);

  const underlineY = nameY + 42 + 2;
  const ulGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  ulGrad.addColorStop(0, 'transparent');
  ulGrad.addColorStop(0.15, '#d4af37');
  ulGrad.addColorStop(0.85, '#d4af37');
  ulGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = ulGrad;
  ctx.fillRect(W / 2 - 200, underlineY, 400, 1.5);

  const afterNames = underlineY + 30;
  ctx.fillStyle = '#5a6a7a';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('завершил(а) симуляцию управления производственным предприятием', W / 2, afterNames);
  ctx.fillText('и продемонстрировал(а) следующие результаты:', W / 2, afterNames + 26);

  const profitLoss = d.profitLoss;
  const resY = afterNames + 70;
  const tableX = 320, tableW = W - 640;

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(26, 60, 94, 0.04)';
  roundRect(tableX - 20, resY - 20, tableW + 40, 210, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const col1 = tableX, col2 = tableX + tableW;
  const results: [string, string, boolean][] = [
    ['Общая выручка', `${d.totalRevenue.toLocaleString('ru-RU')} ₽`, false],
    ['Затраты на сырьё', `${d.totalRMCost.toLocaleString('ru-RU')} ₽`, false],
    ['Проход (Throughput)', `${d.throughput.toLocaleString('ru-RU')} ₽`, false],
    ['Постоянные расходы', `${d.fixedExpenses.toLocaleString('ru-RU')} ₽`, false],
    [profitLoss >= 0 ? 'Чистая прибыль' : 'Убыток', `${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString('ru-RU')} ₽`, true],
    ['Итого касса', `${d.finalCash.toLocaleString('ru-RU')} ₽`, true],
  ];
  results.forEach(([label, value, highlight], i) => {
    const y = resY + i * 30;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(26, 60, 94, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(col1, y - 10);
      ctx.lineTo(col2, y - 10);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = highlight ? '#0f2b47' : '#5a6a7a';
    ctx.font = highlight ? 'bold 16px Georgia, serif' : '16px Georgia, serif';
    ctx.fillText(label, col1, y + 5);
    ctx.textAlign = 'right';
    ctx.fillStyle = highlight ? (profitLoss >= 0 ? '#1a7a2a' : '#b82020') : '#2a3a4a';
    ctx.font = highlight ? 'bold 17px Georgia, serif' : '16px Georgia, serif';
    ctx.fillText(value, col2, y + 5);
  });

  const soldY = resY + results.length * 30 + 15;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#5a6a7a';
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText('Реализовано продукции:', col1, soldY);
  ctx.font = '16px Georgia, serif';
  const prodParts = PRODUCTS.map((p) => `${p.name}: ${d.sold[p.id] || 0}/${p.weeklyDemand}`);
  ctx.fillStyle = '#3a4a5a';
  ctx.fillText(prodParts.join('    |    '), col1, soldY + 26);

  const bottomY = H - 110;
  ctx.textAlign = 'center';
  const sealX = W / 2, sealY = bottomY + 5;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 42, 0, Math.PI * 2);
  const sealGrad = ctx.createRadialGradient(sealX, sealY, 5, sealX, sealY, 42);
  sealGrad.addColorStop(0, 'rgba(232, 200, 74, 0.2)');
  sealGrad.addColorStop(1, 'rgba(212, 175, 55, 0.08)');
  ctx.fillStyle = sealGrad;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sealX, sealY, 42, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sealX, sealY, 35, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#c9a84c';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('TOC', sealX, sealY + 6);

  ctx.textAlign = 'left';
  const brandGrad = ctx.createLinearGradient(0, bottomY, 0, bottomY + 20);
  brandGrad.addColorStop(0, '#0f2b47');
  brandGrad.addColorStop(1, '#1a4a7a');
  ctx.fillStyle = brandGrad;
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText('Tess Technology', 70, bottomY);
  ctx.fillStyle = '#5a6a7a';
  ctx.font = '17px Arial, sans-serif';
  ctx.fillText('стратегия, основанная на цифрах', 70, bottomY + 28);
  ctx.fillStyle = '#7a8a9a';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('tesstech.ru', 70, bottomY + 50);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#5a6a7a';
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText((d.date ?? new Date()).toLocaleDateString('ru-RU'), W - 70, bottomY);
  ctx.fillStyle = '#7a8a9a';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('Дата прохождения', W - 70, bottomY + 24);

  return canvas.toDataURL('image/png');
}

export function downloadCertificatePng(d: CertificateRenderData): void {
  const url = renderCertificateDataUrl(d);
  if (!url) return;
  const link = document.createElement('a');
  link.download = `${(d.name || 'Сертификат').replace(/\s+/g, '_')}.png`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
