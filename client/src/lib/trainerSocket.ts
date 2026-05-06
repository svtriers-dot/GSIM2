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

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";
export type StatusListener = (s: ConnectionStatus) => void;

export class TrainerSocket {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private status: ConnectionStatus = "disconnected";
  private reconnectTimer: number | null = null;
  private closed = false;

  constructor(private sessionId: string) {}

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => {
      try {
        l(s);
      } catch {}
    });
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status); // emit current сразу
    return () => this.statusListeners.delete(listener);
  }

  async connect() {
    const token = getTrainerToken();
    if (!token) return;

    this.setStatus(this.status === "disconnected" ? "connecting" : "reconnecting");

    let ticket: string | null = null;
    try {
      const res = await fetch(`/api/trainer/sessions/${this.sessionId}/ws-ticket`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        ticket = data.ticket as string;
      }
    } catch {}

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = ticket
      ? `${proto}//${location.host}/ws/trainer?ticket=${encodeURIComponent(ticket)}`
      : `${proto}//${location.host}/ws/trainer?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(this.sessionId)}`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener("open", () => {
      this.setStatus("connected");
    });

    this.ws.addEventListener("message", (e) => {
      try {
        const parsed = JSON.parse(e.data);
        this.listeners.forEach((l) => l(parsed));
      } catch {}
    });

    this.ws.addEventListener("close", () => {
      if (this.closed) {
        this.setStatus("disconnected");
        return;
      }
      this.setStatus("reconnecting");
      this.reconnectTimer = window.setTimeout(() => { void this.connect(); }, 3000);
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
    this.setStatus("disconnected");
  }
}
