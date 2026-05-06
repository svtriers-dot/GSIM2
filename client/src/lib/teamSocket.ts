// WebSocket-клиент для команды (одно устройство = одно соединение).

import { getDeviceToken } from "@/lib/auth";

type Listener = (event: { type: string; payload: any }) => void;

export type TeamConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";
export type TeamStatusListener = (s: TeamConnectionStatus) => void;

export class TeamSocket {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private statusListeners: Set<TeamStatusListener> = new Set();
  private status: TeamConnectionStatus = "disconnected";
  private reconnectTimer: number | null = null;
  private closed = false;

  private setStatus(s: TeamConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => { try { l(s); } catch {} });
  }

  getStatus(): TeamConnectionStatus {
    return this.status;
  }

  onStatus(listener: TeamStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  async connect() {
    const token = getDeviceToken();
    if (!token) return;

    // MVP-2 Security: получаем ws-ticket вместо device_token в URL
    let ticket: string | null = null;
    try {
      const res = await fetch("/api/teams/ws-ticket", {
        method: "POST",
        headers: { "X-Device-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        ticket = data.ticket as string;
      }
    } catch {}

    this.setStatus(this.status === "disconnected" ? "connecting" : "reconnecting");

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = ticket
      ? `${proto}//${location.host}/ws/team?ticket=${encodeURIComponent(ticket)}`
      : `${proto}//${location.host}/ws/team?deviceToken=${encodeURIComponent(token)}`;
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
