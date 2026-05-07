// Хранилище JWT тренера + helpers для авторизованных fetch.

const TOKEN_KEY = "tesstoc:trainer:token";
const TRAINER_KEY = "tesstoc:trainer:profile";

export type TrainerRole = "pending" | "active" | "suspended" | "rejected" | "super_admin";

export interface TrainerProfile {
  id: string;
  email: string;
  name: string;
  organization?: string | null;
  role?: TrainerRole;
}

export function getTrainerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTrainerToken(token: string, trainer: TrainerProfile): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TRAINER_KEY, JSON.stringify(trainer));
}

export function getTrainerProfile(): TrainerProfile | null {
  const raw = localStorage.getItem(TRAINER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logoutTrainer(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TRAINER_KEY);
}

async function doAuthFetch(url: string, init: RequestInit, token: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

// MVP-2 Security: при 401 пытаемся получить свежий JWT через /auth/me и ретраим один раз.
// Это делает короткий TTL (1ч) прозрачным для пользователя.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshTokenViaMe(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const oldToken = getTrainerToken();
      if (!oldToken) return null;
      const res = await fetch("/api/trainer/auth/me", {
        headers: { Authorization: `Bearer ${oldToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.token && data.trainer) {
        setTrainerToken(data.token, data.trainer);
        return data.token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      // Сбрасываем in-flight после короткой задержки чтобы конкурентные запросы
      // подождали тот же refresh
      setTimeout(() => {
        refreshInFlight = null;
      }, 100);
    }
  })();
  return refreshInFlight;
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getTrainerToken();
  if (!token) {
    return fetch(url, init); // без токена — не наша забота
  }

  let res = await doAuthFetch(url, init, token);
  if (res.status === 401) {
    const fresh = await refreshTokenViaMe();
    if (fresh) {
      res = await doAuthFetch(url, init, fresh);
    }
  }
  return res;
}

export async function authJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * Скачивание файла с Bearer-токеном в заголовке.
 * Браузер не позволяет вкладывать кастомные заголовки в <a href>, поэтому
 * для защищённых endpoint'ов нужно fetch + Blob + programmatic download.
 *
 * @param url абсолютный или относительный путь
 * @param fallbackFilename имя файла, если сервер не вернул Content-Disposition
 * @returns true если файл скачан, false если ошибка (alert уже показан)
 */
export async function downloadAuthFile(
  url: string,
  fallbackFilename: string,
): Promise<boolean> {
  try {
    const res = await authFetch(url);
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        const data = await res.json();
        if (data?.error) msg = `${res.status}: ${data.error}`;
      } catch {}
      alert(`Не удалось скачать файл: ${msg}`);
      return false;
    }
    const blob = await res.blob();
    let filename = fallbackFilename;
    const cd = res.headers.get("Content-Disposition") || "";
    const m1 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (m1) {
      try { filename = decodeURIComponent(m1[1]); } catch {}
    } else {
      const m2 = /filename="?([^";]+)"?/i.exec(cd);
      if (m2) filename = m2[1];
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch (e: any) {
    alert(`Ошибка скачивания: ${e?.message ?? e}`);
    return false;
  }
}

// Device token для команды (1 устройство = 1 команда)

const DEVICE_KEY = "tesstoc:team:deviceToken";
const TEAM_KEY = "tesstoc:team:meta";

export interface TeamMeta {
  id: string;
  name: string;
  color: string;
  sessionId: string;
}

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_KEY);
}

export function setDeviceToken(token: string, team: TeamMeta): void {
  localStorage.setItem(DEVICE_KEY, token);
  localStorage.setItem(TEAM_KEY, JSON.stringify(team));
}

export function getTeamMeta(): TeamMeta | null {
  const raw = localStorage.getItem(TEAM_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTeamSession(): void {
  localStorage.removeItem(DEVICE_KEY);
  localStorage.removeItem(TEAM_KEY);
}

export async function teamFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getDeviceToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("X-Device-Token", token);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export async function teamJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await teamFetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}
/**
 * Скачивание файла с X-Device-Token в заголовке (для участников команды).
 * Аналог downloadAuthFile, но для team-flow вместо trainer-flow.
 */
export async function downloadTeamFile(
  url: string,
  fallbackFilename: string,
): Promise<boolean> {
  try {
    const res = await teamFetch(url);
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        const data = await res.json();
        if (data?.error) msg = `${res.status}: ${data.error}`;
      } catch {}
      alert(`Не удалось скачать файл: ${msg}`);
      return false;
    }
    const blob = await res.blob();
    let filename = fallbackFilename;
    const cd = res.headers.get("Content-Disposition") || "";
    const m1 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (m1) {
      try { filename = decodeURIComponent(m1[1]); } catch {}
    } else {
      const m2 = /filename="?([^";]+)"?/i.exec(cd);
      if (m2) filename = m2[1];
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch (e: any) {
    alert(`Ошибка скачивания: ${e?.message ?? e}`);
    return false;
  }
}

