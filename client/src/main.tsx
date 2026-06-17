import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { bootstrapSentry, Sentry } from "./lib/sentry";

// Инициализируем Sentry в фоне (DSN приходит из /api/client-config).
void bootstrapSentry();

function CrashFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h1 style={{ fontSize: 20, margin: 0 }}>Что-то пошло не так</h1>
      <p style={{ color: "#667", maxWidth: 420 }}>
        Произошла ошибка интерфейса. Перезагрузите страницу — ваш прогресс восстановится с сервера.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1a4a7a", color: "#fff", fontWeight: 600, cursor: "pointer" }}
      >
        Перезагрузить
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<CrashFallback />}>
    <App />
  </Sentry.ErrorBoundary>,
);
