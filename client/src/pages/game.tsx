import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { GoldrattEngine, type GameSnapshot, type MachineState, type SessionMetrics } from '@/lib/gameEngine';
import {
  STATIONS,
  CONNECTIONS,
  PRODUCTS,
  RAW_MATERIALS,
  MACHINE_TYPES,
  GAME_CONSTANTS,
  COLOR_MAP,
  FLOOR_WIDTH,
  FLOOR_HEIGHT,
  getStationPos,
  getDemandPos,
  type MachineColor,
} from '@/lib/gameConfig';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Info, FastForward, ShoppingCart, Sun, Moon, Download, Plus, X, Home, HelpCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';
import type { GameResult } from '@shared/schema';

function formatTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function getColorHex(color: MachineColor): string {
  return COLOR_MAP[color].fill;
}

function getColorStroke(color: MachineColor): string {
  return COLOR_MAP[color].stroke;
}

function StatusBadge({ title, lines, bgColor }: { title?: string; lines: string[]; bgColor: string }) {
  return (
    <div
      data-testid={`status-${title?.toLowerCase().replace(/\s/g, '-') || 'badge'}`}
      className="rounded-md px-2 py-1"
      style={{ background: bgColor }}
    >
      <div className="flex flex-wrap gap-x-2 items-center">
        {title && (
          <span className="text-[11px] font-mono text-white/70 leading-tight whitespace-nowrap">
            {title}
          </span>
        )}
        {lines.map((line, i) => (
          <span key={i} className="text-[12px] font-mono font-bold text-white leading-tight whitespace-nowrap">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

function MachineIcon({ color, size = 24, isAssembly = false }: { color: string; size?: number; isAssembly?: boolean }) {
  if (isAssembly) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="8" width="18" height="13" rx="2" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
        <path d="M5,4 L9,8" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M19,4 L15,8" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="5" cy="3.5" r="2.5" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
        <circle cx="19" cy="3.5" r="2.5" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
        <path d="M8,14 L12,11 L16,14 L12,17 Z" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
        <line x1="12" y1="17" x2="12" y2="21" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="8" width="20" height="12" rx="2" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      <rect x="4" y="4" width="6" height="6" rx="1" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      <circle cx="8" cy="14" r="3" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="14" y="5" width="4" height="3" rx="0.5" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      <line x1="16" y1="5" x2="16" y2="2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="14" r="2" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

function MachineSquare({
  machine,
  isSelected,
  onClick,
}: {
  machine: MachineState;
  isSelected: boolean;
  onClick: () => void;
}) {
  const colorHex = getColorHex(machine.color);
  const strokeHex = getColorStroke(machine.color);
  const statusLabel = machine.assignedTo
    ? machine.status === 'setup'
      ? 'setup'
      : machine.status === 'prod'
        ? 'prod'
        : 'idle'
    : '';
  const locationLabel = machine.assignedTo || '';

  return (
    <div
      data-testid={`machine-${machine.id}`}
      className="cursor-pointer select-none relative"
      style={{
        width: 50,
        height: 44,
        background: `linear-gradient(180deg, ${colorHex}22, ${colorHex}44)`,
        border: isSelected ? `2px solid ${colorHex}` : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        opacity: machine.assignedTo ? 0.6 : 1,
        boxShadow: isSelected ? `0 0 10px ${colorHex}66` : 'none',
      }}
      onClick={onClick}
    >
      <MachineIcon color={colorHex} size={22} isAssembly={machine.color === 'brown'} />
      <span className="text-[10px] font-mono font-bold leading-none" style={{ color: colorHex }}>
        {locationLabel || '\u00A0'}
      </span>
      {statusLabel && (
        <span className="text-[7px] font-mono leading-none" style={{ color: strokeHex }}>
          {statusLabel}
        </span>
      )}
    </div>
  );
}

// MVP-2: режим сессии — Game становится управляемым тренером.
// Если sessionMode задан — кнопки Play/Pause/Reset скрываются (глобальным таймером управляет тренер),
// engine.tick игнорируется при isPaused/isEnded, метрики и действия отправляются через callbacks.
export interface GameSessionMode {
  isPaused: boolean;
  isEnded: boolean;
  // Восстановление состояния при reconnect (опционально, MVP-2.A4)
  restoreSnapshot?: GameSnapshot | null;
  // Раз в N миллисекунд (по умолчанию 2000) — отправляется текущий срез метрик
  onMetricsUpdate?: (m: SessionMetrics) => void;
  // На каждое значимое действие игрока (place_machine / remove_machine / buy_rm / set_pace / reset)
  onAction?: (actionType: string, payload: Record<string, unknown>) => void;
  // На завершение игрового времени (totalDays закончились) — отдаём финальный snapshot
  onGameEnd?: (snapshot: GameSnapshot, metrics: SessionMetrics) => void;
  // ID станции, которую тренер сейчас аннотирует — её надо подсветить пульсирующим overlay
  highlightedStationId?: string | null;
  // V2 — кастом-конфиг: пресет сложности + ручные overrides
  scenarioPreset?: string;
  constantsOverrides?: { startingCash?: number; fixedExpenses?: number; totalDays?: number; dayDurationSeconds?: number };
  // V2 forced events — последнее полученное событие (Game применяет его к engine)
  lastForcedEvent?: {
    type: string;
    payload: Record<string, unknown>;
    durationMs: number | null;
    triggeredAt: number;
  } | null;
}

export default function Game({ sessionMode }: { sessionMode?: GameSessionMode } = {}) {
  // Engine инициализируется один раз при mount. В session-mode применяются preset/overrides
  // от тренера. После init они не меняются (мы не пересоздаём engine на лету).
  const engineRef = useRef<GoldrattEngine>(
    new GoldrattEngine({
      preset: undefined,
      overrides: undefined,
    }),
  );

  // При получении нового sessionMode (первый рендер с конфигом) — пересоздадим engine
  // чтобы стартовый кэш и постоянка применились корректно.
  const engineConfigKey = useMemo(() => {
    return `${sessionMode?.scenarioPreset ?? ""}|${JSON.stringify(sessionMode?.constantsOverrides ?? {})}`;
  }, [sessionMode?.scenarioPreset, sessionMode?.constantsOverrides]);

  useEffect(() => {
    if (!sessionMode) return; // в одиночном режиме оставляем дефолт
    engineRef.current = new GoldrattEngine({
      preset: sessionMode.scenarioPreset,
      overrides: sessionMode.constantsOverrides,
    });
    setState(engineRef.current.getSnapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineConfigKey]);
  const [state, setState] = useState<GameSnapshot>(engineRef.current.getSnapshot());
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [purchaseRM, setPurchaseRM] = useState<string | null>(null);
  const [purchaseQty, setPurchaseQty] = useState('5');
  const [showInfo, setShowInfo] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [floorDark, setFloorDark] = useState(false);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [certNames, setCertNames] = useState<string[]>(['']);

  const ft = floorDark
    ? {
        bg: '#0d1b2a',
        text: '#8899aa',
        textBright: '#aabbcc',
        demandBox: '#1b2838',
        demandStroke: '#445566',
        demandAccent: '#00CED1',
        soldBox: '#1a2535',
        soldStroke: '#334455',
        colLabel: '#556677',
        connLine: '#334466',
        arrow: '#556',
        bufBox: '#1a2535',
        bufStroke: '#445566',
        rmBox: '#2a3a4a',
        rmInner: '#3d5a78',
        rmStroke: '#5a7a9a',
        rmBar: '#5a7a9a',
        rmCounter: '#1b2b3b',
        rmText: '#8ab4d8',
        rmPrice: '#667788',
        stationText: 'white',
        machineMarker: 'white',
        setupText: '#ffcc00',
        priceText: '#66aacc',
        rowLabel: '#445566',
        highlight: 'white',
        progressBar: 'white',
      }
    : {
        bg: '#f7f4ec',          /* светло-бежевый, чуть светлее основного */
        text: '#5a6478',        /* muted из палитры */
        textBright: '#11192d',  /* fg из палитры */
        demandBox: '#ffffff',
        demandStroke: '#dcd5c4',
        demandAccent: '#11192d',
        soldBox: '#f0ebe0',
        soldStroke: '#dcd5c4',
        colLabel: '#5a6478',
        connLine: '#c0b9a4',
        arrow: '#5a6478',
        bufBox: '#ffffff',
        bufStroke: '#dcd5c4',
        rmBox: '#eae4d6',
        rmInner: '#dcd5c4',
        rmStroke: '#a8a25a',
        rmBar: '#a8a25a',
        rmCounter: '#eae4d6',
        rmText: '#11192d',
        rmPrice: '#5a6478',
        stationText: 'white',
        machineMarker: '#11192d',
        setupText: '#c87a4a',
        priceText: '#11192d',
        rowLabel: '#5a6478',
        highlight: '#11192d',
        progressBar: 'white',
      };


  const saveResultMutation = useMutation({
    mutationFn: async (data: { playerName: string; finalCash: number; totalRevenue: number; totalRmCost: number; productsSold: Record<string, number> }) => {
      const res = await apiRequest('POST', '/api/game-results', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-results'] });
      setResultSaved(true);
    },
  });

  const updateState = useCallback(() => {
    setState(engineRef.current.getSnapshot());
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    let lastRender = 0;
    let lastMetricsSent = 0;
    let animId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Session-mode: тренер управляет таймером
      const blockedBySession = sessionMode && (sessionMode.isPaused || sessionMode.isEnded);
      if (!blockedBySession) {
        engineRef.current.tick(dt);
      }

      if (now - lastRender > 80) {
        updateState();
        lastRender = now;
      }

      // Session-mode: каждые 2 сек отправляем метрики
      if (sessionMode?.onMetricsUpdate && now - lastMetricsSent > 2000) {
        try {
          sessionMode.onMetricsUpdate(engineRef.current.getMetrics());
        } catch (e) {
          console.error("metrics callback error:", e);
        }
        lastMetricsSent = now;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [updateState, sessionMode]);

  // Session-mode: восстановление состояния при reconnect
  useEffect(() => {
    if (sessionMode?.restoreSnapshot) {
      try {
        const snap = sessionMode.restoreSnapshot;
        const engine = engineRef.current;
        // Простое восстановление ключевых полей. Полный rehydrate — V2.
        engine.cash = snap.cash;
        engine.day = snap.day;
        engine.timeInDay = snap.timeInDay;
        engine.totalRevenue = snap.totalRevenue;
        engine.totalRMCost = snap.totalRMCost;
        engine.buffers = { ...snap.buffers };
        engine.machines = snap.machines.map(m => ({ ...m }));
        engine.stationStates = Object.fromEntries(
          Object.entries(snap.stationStates).map(([k, v]) => [k, { ...v }]),
        );
        engine.sold = { ...snap.sold };
        engine.demandRemaining = { ...snap.demandRemaining };
        engine.dailyRevenue = snap.dailyRevenue;
        engine.dailyRMCost = snap.dailyRMCost;
        engine.gameOver = snap.gameOver;
        setState(engine.getSnapshot());
      } catch (e) {
        console.error("restoreSnapshot error:", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMode?.restoreSnapshot]);

  // V2 forced events — применяем к engine при изменении triggeredAt
  useEffect(() => {
    const ev = sessionMode?.lastForcedEvent;
    if (!ev) return;
    const engine = engineRef.current;
    try {
      if (ev.type === "machine_breakdown") {
        const machineId = (ev.payload as any)?.machineId;
        const dur = ev.durationMs ?? 60000;
        if (machineId) engine.applyMachineBreakdown(machineId, dur);
      } else if (ev.type === "demand_spike" || ev.type === "demand_drop") {
        const productId = (ev.payload as any)?.productId;
        const mult = (ev.payload as any)?.multiplier ?? (ev.type === "demand_spike" ? 2 : 0.5);
        const dur = ev.durationMs ?? 60000;
        if (productId) engine.applyDemandMultiplier(productId, mult, dur);
      } else if (ev.type === "wage_increase") {
        const percent = (ev.payload as any)?.percent ?? 20;
        engine.applyWageIncrease(percent);
      }
      setState(engine.getSnapshot());
    } catch (e) {
      console.error("forced event apply error:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMode?.lastForcedEvent?.triggeredAt]);

  // Session-mode: при isEnded — финализация
  useEffect(() => {
    if (sessionMode?.isEnded && sessionMode.onGameEnd) {
      try {
        sessionMode.onGameEnd(engineRef.current.getSnapshot(), engineRef.current.getMetrics());
      } catch (e) {
        console.error("onGameEnd error:", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMode?.isEnded]);

  const showNotif = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleStationClick = (stationId: string) => {
    if (!selectedMachine) return;
    const result = engineRef.current.placeMachine(selectedMachine, stationId);
    if (result.success) {
      sessionMode?.onAction?.("place_machine", { machineId: selectedMachine, stationId });
      setSelectedMachine(null);
      showNotif(result.message);
    } else {
      showNotif(result.message);
    }
    updateState();
  };

  const handleMachineClick = (machineId: string) => {
    const machine = state.machines.find(m => m.id === machineId);
    if (!machine) return;

    if (selectedMachine === machineId) {
      setSelectedMachine(null);
      return;
    }

    if (machine.assignedTo) {
      engineRef.current.removeMachine(machineId);
      sessionMode?.onAction?.("remove_machine", { machineId });
      setSelectedMachine(null);
      updateState();
      showNotif('Станок снят');
      return;
    }

    setSelectedMachine(machineId);
  };

  const handleBuyRM = () => {
    if (!purchaseRM) return;
    const qty = parseInt(purchaseQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showNotif('Введите корректное количество');
      return;
    }
    const result = engineRef.current.buyRawMaterial(purchaseRM, qty);
    showNotif(result.message);
    if (result.success) {
      sessionMode?.onAction?.("buy_rm", { rmId: purchaseRM, qty });
      setPurchaseRM(null);
      setPurchaseQty('5');
    }
    updateState();
  };

  const handleQuickBuyRM = (rmId: string, qty: number) => {
    const result = engineRef.current.buyRawMaterial(rmId, qty);
    if (result.success) {
      sessionMode?.onAction?.("buy_rm", { rmId, qty });
    }
    showNotif(result.message);
    updateState();
  };

  const handleToggle = () => {
    if (sessionMode) return; // в session-mode таймер контролирует тренер
    engineRef.current.toggleRunning();
    updateState();
  };

  const handlePaceChange = () => {
    const nextPace = state.pace >= 5 ? 1 : state.pace + 1;
    engineRef.current.setPace(nextPace);
    updateState();
  };

  const handlePace10 = () => {
    engineRef.current.setPace(state.pace === 10 ? 1 : 10);
    updateState();
  };

  const handleReset = () => {
    if (sessionMode) return; // в session-mode reset делает тренер через reset-round
    engineRef.current.resetGame();
    setSelectedMachine(null);
    setResultSaved(false);
    updateState();
  };

  const handleDismissSummary = () => {
    engineRef.current.dismissDaySummary();
    engineRef.current.running = true;
    updateState();
  };

  const groupedMachines: Record<string, MachineState[]> = {};
  for (const m of state.machines) {
    const key = m.color;
    if (!groupedMachines[key]) groupedMachines[key] = [];
    groupedMachines[key].push(m);
  }

  const selectedMachineColor = selectedMachine
    ? state.machines.find(m => m.id === selectedMachine)?.color
    : null;

  const generateCertificate = useCallback(() => {
    const names = certNames.filter(n => n.trim().length > 0);
    if (names.length === 0) return;

    const W = 1400, H = 1000;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      const gold1 = '#c9a84c';
      const gold2 = '#d4af37';
      ctx.strokeStyle = gold1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(60, 0);
      ctx.moveTo(0, 0); ctx.lineTo(0, 60);
      ctx.stroke();
      ctx.strokeStyle = gold2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = gold2;
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
    const nameY = names.length === 1 ? 305 : 295;
    names.forEach((name, i) => {
      ctx.fillText(name.trim(), W / 2, nameY + i * 42);
    });

    const underlineY = nameY + names.length * 42 + 2;
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
    const plural = names.length > 1;
    ctx.fillText(plural ? 'завершили симуляцию управления производственным предприятием' : 'завершил(а) симуляцию управления производственным предприятием', W / 2, afterNames);
    ctx.fillText(plural ? 'и продемонстрировали следующие результаты:' : 'и продемонстрировал(а) следующие результаты:', W / 2, afterNames + 26);

    const summary = state.dayEndSummary;
    const profitLoss = summary?.profitLoss ?? 0;
    const resY = afterNames + 70;

    const tableX = 320, tableW = W - 640;
    ctx.fillStyle = 'rgba(26, 60, 94, 0.04)';
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
    roundRect(tableX - 20, resY - 20, tableW + 40, 210, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const col1 = tableX, col2 = tableX + tableW;

    const results: [string, string, boolean][] = [
      ['Общая выручка', `${state.totalRevenue.toLocaleString()} ₽`, false],
      ['Затраты на сырьё', `${state.totalRMCost.toLocaleString()} ₽`, false],
      ['Проход (Throughput)', `${(summary?.throughput ?? 0).toLocaleString()} ₽`, false],
      ['Постоянные расходы', `${state.fixedExpenses.toLocaleString()} ₽`, false],
      [profitLoss >= 0 ? 'Чистая прибыль' : 'Убыток', `${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString()} ₽`, true],
      ['Итого касса', `${state.cash.toLocaleString()} ₽`, true],
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
    const prodParts = PRODUCTS.map(p => {
      const sold = state.sold[p.id] || 0;
      return `${p.name}: ${sold}/${p.weeklyDemand}`;
    });
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
    const now = new Date();
    ctx.fillText(now.toLocaleDateString('ru-RU'), W - 70, bottomY);
    ctx.fillStyle = '#7a8a9a';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('Дата прохождения', W - 70, bottomY + 24);

    const link = document.createElement('a');
    link.download = 'certificate_goldratt.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [certNames, state]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <div className="flex flex-col w-[200px] min-w-[200px] border-r border-border p-2.5 gap-2 overflow-hidden">
        <StatusBadge
          lines={[`Рабочий день ${state.day}`, formatTime(state.timeInDay), `x${state.pace}`]}
          bgColor={state.running ? '#2e7d32' : '#555'}
        />
        <div
          data-testid="status-cash"
          className="rounded-md px-3 py-2 text-center"
          style={{ background: state.cash >= 0 ? '#2a6478' : '#7a1a1a' }}
        >
          <div className="text-[10px] font-mono text-white/60 leading-tight">Касса</div>
          <div className="text-[18px] font-mono font-bold text-white leading-tight">
            {state.cash.toLocaleString()}₽
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 w-full">
          <Button data-testid="button-toggle" size="icon" variant={state.running ? 'default' : 'secondary'} onClick={handleToggle} className="w-full">
            {state.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button data-testid="button-pace" size="icon" variant="secondary" onClick={handlePaceChange} className="w-full">
            <FastForward className="w-4 h-4" />
          </Button>
          <Button data-testid="button-pace-10" size="icon" variant={state.pace === 10 ? 'default' : 'secondary'} onClick={handlePace10} className="w-full text-xs font-mono">
            x10
          </Button>
          <span
            data-testid="text-speed"
            className="flex items-center justify-center text-[14px] font-mono font-bold"
            style={{ color: state.pace >= 5 ? '#ff9900' : state.pace > 1 ? '#66aacc' : undefined }}
          >
            x{state.pace}
          </span>
          <Button data-testid="button-reset" size="icon" variant="secondary" onClick={handleReset} className="w-full">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button data-testid="button-info" size="icon" variant="secondary" onClick={() => setShowInfo(true)} className="w-full">
            <Info className="w-4 h-4" />
          </Button>
          <Button data-testid="button-floor-theme" size="icon" variant="secondary" onClick={() => setFloorDark(d => !d)} className="w-full">
            {floorDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        <Button
          data-testid="button-howto"
          size="sm"
          variant="default"
          onClick={() => setShowHowTo(true)}
          className="w-full justify-start gap-2 text-xs"
        >
          <HelpCircle className="w-4 h-4" />
          Как играть
        </Button>
        <Link href="/" data-testid="button-home">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2 text-xs"
          >
            <Home className="w-4 h-4" />
            На главную
          </Button>
        </Link>

        <div className="text-[12px] text-muted-foreground font-semibold">Станки</div>
        {MACHINE_TYPES.map(mt => (
          <div key={mt.color} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <MachineIcon color={getColorHex(mt.color)} size={14} isAssembly={mt.color === 'brown'} />
              <span className="text-[11px] font-mono font-semibold" style={{ color: getColorHex(mt.color) }}>
                {mt.label}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({mt.setupTime}с)
              </span>
            </div>
            <div className="flex gap-0.5 flex-wrap">
              {(groupedMachines[mt.color] || []).map(m => (
                <MachineSquare
                  key={m.id}
                  machine={m}
                  isSelected={selectedMachine === m.id}
                  onClick={() => handleMachineClick(m.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {selectedMachine && (
          <div className="text-[12px] text-center p-1.5 rounded-md bg-primary/20 text-primary-foreground border border-primary/30">
            Выберите позицию
          </div>
        )}

        <div className="mt-auto" />

        <Link
          href="/"
          data-testid="link-home"
          className="flex items-center gap-2 pt-1 border-t border-border/50 hover:opacity-100 opacity-80 transition-opacity cursor-pointer"
        >
          <img src={tessLogo} alt="Tess Technology" className="w-7 h-7" />
          <div className="leading-tight flex-1">
            <div className="text-[11px] font-bold text-foreground/70 flex items-center gap-1">
              <Home className="w-3 h-3" />
              На главную
            </div>
            <div className="text-[9px] text-muted-foreground">tesstech.ru</div>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {notification && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-card border border-border text-sm text-card-foreground shadow-lg">
            {notification}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-1 min-h-0">
          <svg
            viewBox={`0 0 ${FLOOR_WIDTH} ${FLOOR_HEIGHT}`}
            className="w-full h-full"
            style={{ background: ft.bg, transition: 'background 0.3s' }}
            preserveAspectRatio="xMidYMid meet"
            data-testid="factory-floor"
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <path d="M0,0.5 L9,3.5 L0,6.5 L2,3.5 Z" fill={ft.arrow} />
              </marker>
              <marker id="arrowhead-rm" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0.5 L7,3 L0,5.5 L1.5,3 Z" fill={ft.arrow} opacity={0.6} />
              </marker>
              {Object.entries(COLOR_MAP).map(([color, vals]) => (
                <linearGradient key={color} id={`grad_${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={vals.fill} stopOpacity="1" />
                  <stop offset="100%" stopColor={vals.stroke} stopOpacity="1" />
                </linearGradient>
              ))}
            </defs>

            <text x={30} y={44} textAnchor="middle" fill={ft.rowLabel} fontSize="13" fontFamily="monospace">
              Рынок
            </text>

            {PRODUCTS.map(p => {
              const pos = getDemandPos(p.id);
              const sold = state.sold[p.id] || 0;
              const remaining = Math.max(0, p.weeklyDemand - sold);
              const isFulfilled = remaining === 0;

              return (
                <g key={`demand_${p.id}`} data-testid={`demand-${p.id}`}>
                  <rect x={pos.x - 38} y={pos.y - 20} width={76} height={50} rx={5} fill={ft.demandBox} stroke={ft.demandStroke} strokeWidth={1} />

                  <text x={pos.x} y={pos.y - 10} textAnchor="middle" dominantBaseline="middle" fill={ft.demandAccent} fontSize="13" fontWeight="bold" fontFamily="monospace">
                    {p.name}
                  </text>

                  <text x={pos.x - 10} y={pos.y + 12} textAnchor="middle" dominantBaseline="middle" fill={isFulfilled ? ft.progressBar : ft.demandAccent} fontSize="18" fontWeight="bold" fontFamily="monospace">
                    {remaining}
                  </text>

                  <text x={pos.x + 16} y={pos.y + 12} textAnchor="middle" dominantBaseline="middle" fill={ft.text} fontSize="11" fontFamily="monospace" opacity={0.6}>
                    /{p.weeklyDemand}
                  </text>

                  <text x={pos.x + 43} y={pos.y + 4} textAnchor="start" fill={ft.priceText} fontSize="13" fontWeight="bold" fontFamily="monospace">
                    {p.price}₽
                  </text>
                </g>
              );
            })}

            {['A', 'B', 'C', 'D', 'E', 'F'].map(col => {
              const x = getStationPos(`RM_${col}`).x;
              return (
                <text key={`col_${col}`} x={x} y={FLOOR_HEIGHT - 10} textAnchor="middle" fill={ft.colLabel} fontSize="14" fontWeight="bold" fontFamily="monospace">
                  {col}
                </text>
              );
            })}

            {(() => {
              const rmY = getStationPos('RM_A').y;
              return (
                <>
                  <text x={30} y={rmY - 8} textAnchor="middle" fill={ft.colLabel} fontSize="10" fontFamily="monospace">
                    Закупка
                  </text>
                  <text x={30} y={rmY + 4} textAnchor="middle" fill={ft.colLabel} fontSize="10" fontFamily="monospace">
                    сырья
                  </text>
                  <text x={30} y={rmY + 16} textAnchor="middle" fill={ft.rmPrice} fontSize="10" fontWeight="bold" fontFamily="monospace">
                    20₽/ед
                  </text>
                </>
              );
            })()}

            {CONNECTIONS.map((conn, i) => {
              const fromPos = getStationPos(conn.from);
              const toPos = getStationPos(conn.to);
              if (!fromPos || !toPos) return null;

              const isRM = conn.from.startsWith('RM_');
              const stW = 56, stH = 34;
              const rmH = 16;

              const dx = toPos.x - fromPos.x;

              let x1 = fromPos.x;
              let y1 = isRM ? fromPos.y - rmH : fromPos.y - stH / 2;
              let x2 = toPos.x;
              let y2 = toPos.y + stH / 2;

              const isSameCol = Math.abs(dx) < 5;

              let pathD: string;
              if (isSameCol) {
                pathD = `M${x1},${y1} L${x2},${y2}`;
              } else {
                const midY = (y1 + y2) / 2;
                const curveStrength = Math.min(Math.abs(dx) * 0.35, 40);
                pathD = `M${x1},${y1} C${x1},${y1 - curveStrength} ${x2},${y2 + curveStrength} ${x2},${y2}`;
              }

              return (
                <path
                  key={`conn_${i}`}
                  d={pathD}
                  stroke={ft.connLine}
                  strokeWidth={isRM ? 1 : 1.5}
                  fill="none"
                  strokeLinecap="round"
                  opacity={isRM ? 0.5 : 0.8}
                  markerEnd={isRM ? 'url(#arrowhead-rm)' : 'url(#arrowhead)'}
                />
              );
            })}

            {(() => {
              const rendered = new Set<string>();
              return STATIONS.map(stationDef => {
                const isFinal = PRODUCTS.some(p => p.finalStation === stationDef.id);
                if (isFinal) return null;

                const bufId = stationDef.id === 'B3' ? 'B3_shared' : `${stationDef.id}_out`;
                if (rendered.has(bufId)) return null;
                rendered.add(bufId);

                const bufVal = state.buffers[bufId] || 0;
                const pos = getStationPos(stationDef.id);
                const bx = pos.x;
                const by = pos.y - 26;
                const hasItems = bufVal > 0;

                return (
                  <g key={`buf_${stationDef.id}`} data-testid={`buf-${stationDef.id}`}>
                    <rect
                      x={bx - 12} y={by - 7}
                      width={24} height={14}
                      rx={3}
                      fill={ft.bufBox}
                      stroke={hasItems ? ft.demandAccent : ft.bufStroke}
                      strokeWidth={hasItems ? 1.2 : 0.6}
                    />
                    <text
                      x={bx} y={by}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={hasItems ? ft.textBright : ft.text}
                      fontSize="12" fontWeight="bold" fontFamily="monospace"
                      opacity={hasItems ? 1 : 0.5}
                    >
                      {bufVal}
                    </text>
                    <path
                      d={`M${bx},${by + 8} L${bx - 3},${by + 4} L${bx + 3},${by + 4} Z`}
                      fill={hasItems ? ft.demandAccent : ft.bufStroke}
                      opacity={hasItems ? 0.8 : 0.4}
                    />
                  </g>
                );
              });
            })()}

            {RAW_MATERIALS.map(rm => {
              const pos = getStationPos(rm.id);
              const bufVal = state.buffers[rm.id] || 0;

              return (
                <g
                  key={rm.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setPurchaseRM(rm.id);
                    setPurchaseQty('5');
                  }}
                  data-testid={`rm-${rm.col}`}
                >
                  <rect x={pos.x - 24} y={pos.y - 16} width={48} height={32} rx={3} fill={ft.rmBox} stroke={ft.rmStroke} strokeWidth={1.2} />
                  <line x1={pos.x - 18} y1={pos.y - 16} x2={pos.x - 18} y2={pos.y + 16} stroke={ft.rmStroke} strokeWidth={0.6} opacity={0.3} />
                  <line x1={pos.x + 18} y1={pos.y - 16} x2={pos.x + 18} y2={pos.y + 16} stroke={ft.rmStroke} strokeWidth={0.6} opacity={0.3} />
                  <line x1={pos.x - 24} y1={pos.y} x2={pos.x + 24} y2={pos.y} stroke={ft.rmStroke} strokeWidth={0.6} opacity={0.25} />
                  <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fill={ft.rmText} fontSize="16" fontWeight="bold" fontFamily="monospace">
                    {bufVal}
                  </text>
                  <g
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleQuickBuyRM(rm.id, 5); }}
                    data-testid={`rm-quick-5-${rm.col}`}
                  >
                    <rect x={pos.x - 22} y={pos.y + 20} width={20} height={14} rx={3} fill={ft.rmInner} stroke={ft.rmStroke} strokeWidth={0.8} />
                    <text x={pos.x - 12} y={pos.y + 28} textAnchor="middle" dominantBaseline="middle" fill={ft.rmText} fontSize="9" fontWeight="bold" fontFamily="monospace">+5</text>
                  </g>
                  <g
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleQuickBuyRM(rm.id, 10); }}
                    data-testid={`rm-quick-10-${rm.col}`}
                  >
                    <rect x={pos.x + 2} y={pos.y + 20} width={20} height={14} rx={3} fill={ft.rmInner} stroke={ft.rmStroke} strokeWidth={0.8} />
                    <text x={pos.x + 12} y={pos.y + 28} textAnchor="middle" dominantBaseline="middle" fill={ft.rmText} fontSize="9" fontWeight="bold" fontFamily="monospace">+10</text>
                  </g>
                </g>
              );
            })}

            {STATIONS.map(stationDef => {
              const pos = getStationPos(stationDef.id);
              const sState = state.stationStates[stationDef.id];
              const hasMachine = !!sState?.machineId;
              const isProducing = sState?.status === 'prod';
              const isSetup = sState?.status === 'setup';
              const isIdle = hasMachine && sState?.status === 'idle';
              const isHighlightable = selectedMachineColor === stationDef.color;
              const isFinal = PRODUCTS.some(p => p.finalStation === stationDef.id);

              let pulseOpacity = 1;
              if (isProducing) {
                pulseOpacity = 0.85;
              } else if (isIdle) {
                pulseOpacity = 0.5;
              }

              return (
                <g
                  key={stationDef.id}
                  className={isHighlightable ? 'cursor-pointer' : ''}
                  onClick={() => handleStationClick(stationDef.id)}
                  data-testid={`station-${stationDef.id}`}
                >
                  {(() => {
                    const w = 56, h = 34;
                    const sx = pos.x - w / 2, sy = pos.y - h / 2;
                    const colorFill = `url(#grad_${stationDef.color})`;
                    const colorStroke = hasMachine ? ft.machineMarker : getColorStroke(stationDef.color);
                    const sw = hasMachine ? 2 : 1.2;
                    const isAssemblyStation = stationDef.isAssembly;

                    return (
                      <>
                        {isHighlightable && (
                          <rect x={sx - 5} y={sy - 5} width={w + 10} height={h + 10} rx={8} fill="none" stroke={ft.highlight} strokeWidth={2} strokeDasharray="4 2" opacity={0.6}>
                            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
                          </rect>
                        )}

                        {sessionMode?.highlightedStationId === stationDef.id && (
                          <rect x={sx - 8} y={sy - 8} width={w + 16} height={h + 16} rx={10} fill="none" stroke="#f59e0b" strokeWidth={3} opacity={0.9}>
                            <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
                            <animate attributeName="stroke-width" values="2;4;2" dur="1s" repeatCount="indefinite" />
                          </rect>
                        )}

                        <rect x={sx + 6} y={sy + h} width={5} height={4} rx={1} fill={colorStroke} opacity={0.5 * pulseOpacity} />
                        <rect x={sx + w - 11} y={sy + h} width={5} height={4} rx={1} fill={colorStroke} opacity={0.5 * pulseOpacity} />

                        <rect x={sx + 4} y={sy - 5} width={8} height={6} rx={1.5} fill={colorStroke} opacity={0.45 * pulseOpacity} />
                        <line x1={sx + 8} y1={sy - 5} x2={sx + 8} y2={sy - 9} stroke={colorStroke} strokeWidth={1.5} strokeLinecap="round" opacity={0.4 * pulseOpacity} />

                        {isAssemblyStation && (
                          <>
                            <circle cx={sx + 10} cy={sy - 4} r={3} fill={colorStroke} opacity={0.4 * pulseOpacity} />
                            <circle cx={sx + w - 10} cy={sy - 4} r={3} fill={colorStroke} opacity={0.4 * pulseOpacity} />
                          </>
                        )}

                        <rect x={sx} y={sy} width={w} height={h} rx={4} fill={colorFill} stroke={colorStroke} strokeWidth={sw} opacity={pulseOpacity}>
                          {isProducing && (
                            <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
                          )}
                        </rect>

                        {isProducing && sState && (
                          <rect
                            x={sx + 2}
                            y={sy + h - 5}
                            width={(w - 4) * (1 - sState.processRemaining / (STATIONS.find(s => s.id === stationDef.id)?.processTime || 1))}
                            height={3}
                            rx={1}
                            fill={ft.progressBar}
                            opacity={0.7}
                          />
                        )}

                        <text x={pos.x + 12} y={pos.y + 2} textAnchor="middle" dominantBaseline="middle" fill={ft.stationText} fontSize="13" fontWeight="bold" fontFamily="monospace">
                          {stationDef.processTime}с
                        </text>

                        {hasMachine && (
                          <circle cx={sx + w - 3} cy={sy - 2} r={5} fill={ft.machineMarker} opacity={0.9}>
                            <animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}

                        {isIdle && state.running && (() => {
                          const col = stationDef.col;
                          const onLeft = col === 'D' || col === 'E' || col === 'F';
                          const itx = onLeft ? sx - 4 : sx + w + 4;
                          const ianchor = onLeft ? 'end' : 'start';
                          return (
                            <text x={itx} y={pos.y + 1} textAnchor={ianchor} dominantBaseline="middle" fill={ft.setupText} fontSize="10" fontFamily="monospace" fontWeight="bold" opacity={0.7}>
                              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
                              ожид.
                            </text>
                          );
                        })()}

                        {isSetup && (() => {
                          const col = stationDef.col;
                          const onLeft = col === 'D' || col === 'E' || col === 'F';
                          const tx = onLeft ? sx - 4 : sx + w + 4;
                          const anchor = onLeft ? 'end' : 'start';
                          return (
                            <text x={tx} y={pos.y + 1} textAnchor={anchor} dominantBaseline="middle" fill={ft.setupText} fontSize="13" fontFamily="monospace" fontWeight="bold">
                              настр. {Math.ceil(sState?.setupRemaining || 0)}с
                            </text>
                          );
                        })()}

                      </>
                    );
                  })()}
                </g>
              );
            })}

            {[1, 2, 3, 5, 6, 7, 9].map(row => {
              const y = getStationPos(STATIONS.find(s => s.row === row)?.id || 'A1').y;
              return (
                <text key={`row_${row}`} x={30} y={y + 4} textAnchor="middle" fill={ft.rowLabel} fontSize="13" fontFamily="monospace">
                  {row}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-card/50">
          <span className="text-[12px] text-muted-foreground font-mono">
            Д{state.day}/{GAME_CONSTANTS.totalDays} | {formatTime(state.timeInDay)} | {state.cash.toLocaleString()}₽
          </span>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-[11px]">
              +{state.totalRevenue.toLocaleString()}₽
            </Badge>
            <Badge variant="secondary" className="font-mono text-[11px]">
              -{state.totalRMCost.toLocaleString()}₽
            </Badge>
          </div>
        </div>
      </div>

      <Dialog open={!!purchaseRM} onOpenChange={(open) => { if (!open) setPurchaseRM(null); }}>
        <DialogContent data-testid="dialog-purchase">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Закупка сырья
            </DialogTitle>
          </DialogHeader>
          {purchaseRM && (() => {
            const rm = RAW_MATERIALS.find(r => r.id === purchaseRM);
            if (!rm) return null;
            const qty = parseInt(purchaseQty, 10) || 0;
            const totalCost = qty * rm.cost;
            return (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Столбец <span className="font-bold text-foreground">{rm.col}</span> | Цена: <span className="font-bold text-foreground">{rm.cost}₽</span>/ед.
                </div>
                <div className="text-sm text-muted-foreground">
                  На складе: <span className="font-bold text-foreground">{state.buffers[purchaseRM] || 0}</span> ед.
                </div>
                <div className="text-sm text-muted-foreground">
                  Доступно средств: <span className="font-bold text-foreground">{state.cash.toLocaleString()}₽</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">Количество:</span>
                  <Input
                    data-testid="input-purchase-qty"
                    type="number"
                    min={1}
                    max={Math.floor(state.cash / rm.cost)}
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    className="w-24 font-mono"
                  />
                </div>
                <div className="text-sm">
                  Итого: <span className="font-bold text-foreground">{totalCost.toLocaleString()}₽</span>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button data-testid="button-cancel-purchase" variant="secondary" onClick={() => setPurchaseRM(null)}>
              Отмена
            </Button>
            <Button data-testid="button-confirm-purchase" onClick={handleBuyRM}>
              Купить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHowTo} onOpenChange={setShowHowTo}>
        <DialogContent data-testid="dialog-howto" className="max-h-[85vh] flex flex-col max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Как играть
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-1 text-sm">
            <div className="bg-muted/50 rounded-md p-3 leading-relaxed">
              <strong>Цель:</strong> заработать максимум денег за 5 рабочих дней. Каждую неделю списывается постоянка <span className="font-mono font-semibold">11 000 ₽</span> — её нужно покрыть и желательно перекрыть прибылью.
            </div>

            <div>
              <div className="font-semibold mb-2">Шаги</div>
              <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                <li><strong>Расставьте станки.</strong> Перетащите 8 машин 5 цветов на станции производственной линии. Каждый цвет может работать только на станциях своего типа. У всех машин разное время переналадки (от 0 до 120 секунд).</li>
                <li><strong>Закупите сырьё.</strong> 4 типа сырья по 20 ₽. Кнопками <span className="font-mono">+5 / +10</span> добавляйте сырьё в очередь. Слишком мало — простой машин. Слишком много — заморозка денег.</li>
                <li><strong>Запустите неделю.</strong> Кнопка <Play className="inline w-3 h-3" /> запускает симуляцию. <FastForward className="inline w-3 h-3" /> и <span className="font-mono">×10</span> ускоряют время. Следите за очередями перед станциями — там видно узкие места.</li>
                <li><strong>Заработайте максимум.</strong> Производство → продажи → прибыль. В пятницу — итоговый расчёт и сравнение с другими игроками в рейтинге.</li>
              </ol>
            </div>

            <div>
              <div className="font-semibold mb-2">Подсказки по ТОС</div>
              <ul className="space-y-1.5 list-disc list-inside text-muted-foreground leading-relaxed">
                <li>Самая медленная станция определяет производительность всей системы — это <strong>узкое место</strong>.</li>
                <li>Перед узким местом скапливается очередь сырья. Это и есть сигнал «тут теряются деньги».</li>
                <li>Локальная оптимизация ≠ глобальная: загрузка не-узкой машины на 100% только увеличит запасы.</li>
                <li>Считайте маржу не на единицу продукта, а <strong>на час работы узкого места</strong>.</li>
                <li>Переналадка — это потеря времени. Если узкое место постоянно переключается — оно теряет ещё больше.</li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
              Подробнее о механике, продуктах и станках — кнопка <Info className="inline w-3 h-3" /> «Информация об игре».
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHowTo(false)} data-testid="button-howto-close">Понятно</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent data-testid="dialog-info" className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Информация об игре
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-md p-2">
              Игра длится <span className="font-semibold text-foreground">5 рабочих дней</span> (1 день = 8 ч).
              Постоянные расходы: <span className="font-semibold text-foreground">11 000₽</span>/нед.
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PRODUCTS.map(p => (
                <Card key={p.id} className="p-2">
                  <div className="font-semibold text-xs mb-1">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div>Цена: <span className="text-foreground font-mono">{p.price}₽</span></div>
                    <div>Сырьё: <span className="text-foreground font-mono">{p.rmCost}₽</span></div>
                    <div>Маржа: <span className="text-foreground font-mono">{p.price - p.rmCost}₽</span></div>
                    <div>Спрос: <span className="text-foreground font-mono font-semibold">{p.weeklyDemand}</span>/нед.</div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="border-t border-border pt-2">
              <div className="text-xs font-semibold mb-1.5">Типы станков</div>
              {MACHINE_TYPES.map(mt => (
                <div key={mt.color} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: getColorHex(mt.color) }} />
                  <span className="text-[11px] text-muted-foreground">
                    {mt.label} — {mt.count} шт., настройка: {mt.setupTime}с
                    {mt.color === 'brown' ? ' (сборка)' : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                <div>Стартовый капитал:</div><div className="font-mono text-foreground">{GAME_CONSTANTS.startingCash.toLocaleString()}₽</div>
                <div>Постоянные расходы:</div><div className="font-mono text-foreground">{GAME_CONSTANTS.fixedExpenses.toLocaleString()}₽/нед.</div>
                <div>Длительность дня:</div><div className="font-mono text-foreground">{GAME_CONSTANTS.dayDurationSeconds / 60} мин</div>
                <div>Дней в игре:</div><div className="font-mono text-foreground">{GAME_CONSTANTS.totalDays}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!state.dayEndSummary} onOpenChange={() => {}}>
        <DialogContent data-testid="dialog-day-end" className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {state.gameOver ? 'Игра окончена!' : `Конец дня ${state.dayEndSummary?.day}`}
            </DialogTitle>
          </DialogHeader>
          {state.dayEndSummary && (
            <div className="space-y-2 overflow-y-auto pr-1">
              {!state.gameOver && (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                    <div className="text-muted-foreground">Выручка за день:</div>
                    <div className="font-mono font-bold text-right">{state.dayEndSummary.revenue.toLocaleString()}₽</div>
                    <div className="text-muted-foreground">Затраты на сырье:</div>
                    <div className="font-mono font-bold text-right">{state.dayEndSummary.rmCost.toLocaleString()}₽</div>
                  </div>
                  <div className="border-t border-border pt-1.5">
                    <div className="text-[11px] text-muted-foreground mb-1">Продано за период:</div>
                    {PRODUCTS.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span>{p.name}</span>
                        <span className="font-mono">{state.dayEndSummary!.productsSold[p.id] || 0} / {p.weeklyDemand}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-1.5">
                    <div className="text-[11px] text-muted-foreground mb-1">Загрузка станков:</div>
                    {state.dayEndSummary!.dailyColorUtilization.map(cu => (
                      <div key={cu.color} className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getColorHex(cu.color) }} />
                        <span className="text-[11px] text-muted-foreground w-[80px]">{cu.label}</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${cu.workPercent}%`,
                              background: getColorHex(cu.color),
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-mono w-[32px] text-right">{cu.workPercent}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Проход (П):</span>
                      <span className="font-mono font-bold">{state.dayEndSummary!.throughput.toLocaleString()}₽</span>
                    </div>
                  </div>
                </>
              )}
              {state.gameOver && (
                <>
                  <div className="border-t border-border pt-1.5">
                    <div className="text-[11px] text-muted-foreground mb-1">Продано за неделю:</div>
                    {PRODUCTS.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span>{p.name}</span>
                        <span className="font-mono">{state.dayEndSummary!.productsSold[p.id] || 0} / {p.weeklyDemand}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-1.5">
                    <div className="text-[11px] text-muted-foreground mb-1">Загрузка станков за неделю:</div>
                    {state.dayEndSummary!.colorUtilization.map(cu => (
                      <div key={cu.color} className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getColorHex(cu.color) }} />
                        <span className="text-[11px] text-muted-foreground w-[80px]">{cu.label}</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${cu.workPercent}%`,
                              background: getColorHex(cu.color),
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-mono w-[32px] text-right">{cu.workPercent}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-1.5 space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Общая выручка:</span>
                      <span className="font-mono font-bold">{state.totalRevenue.toLocaleString()}₽</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Затраты на сырье:</span>
                      <span className="font-mono font-bold">-{state.totalRMCost.toLocaleString()}₽</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                      <span className="text-muted-foreground">Проход (П):</span>
                      <span className="font-mono font-bold">{state.dayEndSummary!.throughput.toLocaleString()}₽</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Постоянные расходы:</span>
                      <span className="font-mono font-bold">-{state.fixedExpenses.toLocaleString()}₽</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold border-t border-border pt-1 mt-1">
                      <span>{state.dayEndSummary!.profitLoss >= 0 ? 'Прибыль:' : 'Убыток:'}</span>
                      <span className="font-mono" style={{ color: state.dayEndSummary!.profitLoss >= 0 ? '#32CD32' : '#ff4444' }}>
                        {state.dayEndSummary!.profitLoss >= 0
                          ? `+${state.dayEndSummary!.profitLoss.toLocaleString()}₽`
                          : `${state.dayEndSummary!.profitLoss.toLocaleString()}₽`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Итого касса:</span>
                      <span className="font-mono font-bold" style={{ color: state.cash >= 0 ? '#32CD32' : '#ff4444' }}>
                        {state.cash.toLocaleString()}₽
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            {state.gameOver ? (
              <div className="flex gap-2 w-full justify-end flex-wrap">
                <Button data-testid="button-certificate" variant="secondary" onClick={() => { setShowCertDialog(true); setCertNames(['']); }}>
                  <Download className="w-4 h-4 mr-1" />
                  Сертификат
                </Button>
                <Button data-testid="button-new-game" onClick={handleReset}>Новая игра</Button>
              </div>
            ) : (
              <Button data-testid="button-next-day" onClick={handleDismissSummary}>Следующий день</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
        <DialogContent data-testid="dialog-certificate" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Скачать сертификат</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Введите ФИО участника (участников):
            </div>
            {certNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  data-testid={`input-cert-name-${i}`}
                  placeholder={`ФИО участника ${i + 1}`}
                  value={name}
                  onChange={(e) => {
                    const updated = [...certNames];
                    updated[i] = e.target.value;
                    setCertNames(updated);
                  }}
                />
                {i > 0 && (
                  <Button
                    data-testid={`button-remove-name-${i}`}
                    size="icon"
                    variant="secondary"
                    onClick={() => setCertNames(certNames.filter((_, j) => j !== i))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {certNames.length < 3 && (
              <Button
                data-testid="button-add-participant"
                variant="secondary"
                size="sm"
                onClick={() => setCertNames([...certNames, ''])}
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить участника
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button
              data-testid="button-download-cert"
              onClick={() => {
                generateCertificate();
                setShowCertDialog(false);
              }}
              disabled={certNames.every(n => n.trim().length === 0)}
            >
              <Download className="w-4 h-4 mr-1" />
              Скачать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
