// WebSocket-клиент для тренера. Подключается к /ws/trainer.

import { getTrainerToken } from "@/lib/auth";

export interface SessionLiveState {
  sessionId: string;
  status: string;
  currentRound: { id: string; roundNumber: number; status: string } | null;
  startedAt?: string | null;
  teams: Array<{
    id: string;
    name: string;
    color: string;
    members: { id: string; fullName: string }[];
    metrics: {
      cash: number;
      throughput: number;
      inventory: number;
      operatingExpense: number;
      bottleneckStationId?: string | null;
    };
    lastSeenAt: string;
  }>;
}

type Listener = (event: { type: string; payload: any }) => void;

export class TrainerSocket {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectTimer: number | null = null;
  private closed = false;

  constructor(private sessionId: string) {}

  connect() {
    const token = getTrainerToken();
    if (!token) return;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws/trainer?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(this.sessionId)}`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener("message", (e) => {
      try {
        const parsed = JSON.parse(e.data);
        this.listeners.forEach((l) => l(parsed));
      } catch {}
    });

    this.ws.addEventListener("close", () => {
      if (this.closed) return;
      this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
    });

    this.ws.addEventListener("error", () => {
      try {
        this.ws?.close();
      } catch {}
    });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(type: string, payload?: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  close() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
