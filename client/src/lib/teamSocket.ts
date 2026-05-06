// WebSocket-клиент для команды (одно устройство = одно соединение).

import { getDeviceToken } from "@/lib/auth";

type Listener = (event: { type: string; payload: any }) => void;

export class TeamSocket {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectTimer: number | null = null;
  private closed = false;

  connect() {
    const token = getDeviceToken();
    if (!token) return;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws/team?deviceToken=${encodeURIComponent(token)}`;
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
