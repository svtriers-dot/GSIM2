// Бейдж статуса WebSocket — фиксированно правый верхний угол.
// Используется в /trainer/sessions/:id и в /play/session.

interface Props {
  status: "connecting" | "connected" | "reconnecting" | "disconnected";
  position?: "top-right" | "top-center";
}

const LABELS = {
  connecting: { text: "Подключение…", color: "bg-blue-100 text-blue-700 border-blue-300" },
  connected: { text: "Онлайн", color: "bg-green-100 text-green-700 border-green-300" },
  reconnecting: {
    text: "Переподключаюсь…",
    color: "bg-amber-100 text-amber-700 border-amber-300",
  },
  disconnected: { text: "Нет связи", color: "bg-red-100 text-red-700 border-red-300" },
};

const DOTS = {
  connecting: "bg-blue-500 animate-pulse",
  connected: "bg-green-500",
  reconnecting: "bg-amber-500 animate-pulse",
  disconnected: "bg-red-500",
};

export function ConnectionStatus({ status, position = "top-right" }: Props) {
  const lbl = LABELS[status];
  const dot = DOTS[status];

  // Если онлайн — компактнее, чтобы не отвлекать
  const compact = status === "connected";

  const positionCls =
    position === "top-center"
      ? "top-2 left-1/2 -translate-x-1/2"
      : "top-2 right-2";

  return (
    <div
      className={`fixed ${positionCls} z-40 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border shadow-sm ${lbl.color}`}
      role="status"
      aria-live="polite"
      title={`WebSocket: ${lbl.text}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      {!compact && <span>{lbl.text}</span>}
    </div>
  );
}
