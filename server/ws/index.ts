import { WebSocketServer, type WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { URL } from "url";
import { verifyTrainerToken } from "../lib/jwt";
import { getTeamByDeviceToken } from "../services/sessions";
import { getSessionForTrainer, getSession } from "../services/sessions";
import {
  attachTrainerSocket,
  detachTrainerSocket,
  attachTeamSocket,
  detachTeamSocket,
  applyTeamAction,
  applyTeamMetrics,
  applyTeamGameOver,
} from "../services/orchestrator";

// WebSocket endpoints:
//   ws://host/ws/trainer?token=<JWT>&sessionId=<uuid>
//   ws://host/ws/team?deviceToken=<uuid>

export function setupWebSocket(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  // MVP-2 Security: allowlist для Origin (защита от cross-origin WS-атак)
  const ALLOWED_ORIGINS = new Set<string>([
    "https://toc.tesstech.ru",
    "http://localhost:5000", // dev
    "http://127.0.0.1:5000", // dev
  ]);

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "", "http://localhost");
    if (!url.pathname.startsWith("/ws/")) {
      socket.destroy();
      return;
    }
    // Origin может отсутствовать в нативном клиенте (Postman/curl) — пропускаем,
    // но в браузере он всегда есть. Если он есть и не в allowlist — отбиваем.
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      console.warn(`[ws] reject origin: ${origin}`);
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleConnection(ws, req, url);
    });
  });

  console.log("[ws] WebSocketServer ready on /ws/trainer + /ws/team");
}

async function handleConnection(ws: WebSocket, req: IncomingMessage, url: URL): Promise<void> {
  const path = url.pathname;
  if (path === "/ws/trainer") {
    await handleTrainer(ws, url);
  } else if (path === "/ws/team") {
    await handleTeam(ws, url);
  } else {
    ws.close(4404, "unknown_endpoint");
  }
}

// --- TRAINER channel ------------------------------------------------------

async function handleTrainer(ws: WebSocket, url: URL): Promise<void> {
  const token = url.searchParams.get("token");
  const sessionId = url.searchParams.get("sessionId");
  if (!token || !sessionId) {
    ws.close(4400, "missing_params");
    return;
  }
  const payload = verifyTrainerToken(token);
  if (!payload) {
    ws.close(4401, "invalid_token");
    return;
  }
  const session = await getSessionForTrainer(sessionId, payload.sub);
  if (!session) {
    ws.close(4404, "session_not_found");
    return;
  }
  await attachTrainerSocket(sessionId, ws);
  ws.on("close", () => detachTrainerSocket(sessionId, ws));
  ws.on("error", () => detachTrainerSocket(sessionId, ws));
  ws.on("message", (msg) => {
    // MVP-1: тренер управляет через REST. WS только для подписки на state.
    // Будущее: можно пушить trainer:timer.start и т.д. через WS.
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed?.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
    } catch {}
  });
}

// --- TEAM channel ---------------------------------------------------------

async function handleTeam(ws: WebSocket, url: URL): Promise<void> {
  const deviceToken = url.searchParams.get("deviceToken");
  if (!deviceToken) {
    ws.close(4400, "missing_device_token");
    return;
  }
  const team = await getTeamByDeviceToken(deviceToken);
  if (!team) {
    ws.close(4404, "team_not_found");
    return;
  }
  const session = await getSession(team.sessionId);
  if (!session) {
    ws.close(4404, "session_not_found");
    return;
  }
  await attachTeamSocket(session.id, team.id, ws);

  ws.on("close", () => detachTeamSocket(session.id, team.id, ws));
  ws.on("error", () => detachTeamSocket(session.id, team.id, ws));

  ws.on("message", async (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      const t = parsed?.type;
      if (t === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      if (t === "team:action") {
        const { actionType, payload } = parsed.payload || {};
        if (typeof actionType === "string") {
          await applyTeamAction(session.id, team.id, actionType, payload || {});
        }
        return;
      }
      if (t === "team:metrics") {
        // payload — это сами метрики (см. SessionMetrics из gameEngine)
        await applyTeamMetrics(session.id, team.id, parsed.payload || {});
        return;
      }
      if (t === "team:game_over") {
        const { snapshot, metrics } = parsed.payload || {};
        await applyTeamGameOver(session.id, team.id, snapshot || {}, metrics || {});
        return;
      }
    } catch (e) {
      console.error("team ws message error:", e);
    }
  });
}
