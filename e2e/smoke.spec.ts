import { test, expect } from "@playwright/test";

// Дымовые проверки главного пути: сервер с БД поднялся, SPA смонтировалась,
// ключевые публичные экраны рендерятся без 500.

test("лендинг рендерится", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status() ?? 200).toBeLessThan(400);
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByText("Войти по коду").first()).toBeVisible();
});

test("кабинет тренера: страница входа", async ({ page }) => {
  await page.goto("/trainer/login");
  await expect(page.getByRole("heading", { name: /Тренер/ })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("подключение участника по коду", async ({ page }) => {
  await page.goto("/play/join");
  await expect(page.getByRole("heading", { name: /Мастер-класс/ })).toBeVisible();
  await expect(page.getByPlaceholder("12345")).toBeVisible();
});

test("верификация несуществующего сертификата не падает (нет 500)", async ({ page }) => {
  const res = await page.goto("/verify/doesnotexist");
  expect(res?.status() ?? 200).toBeLessThan(500);
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("health-эндпоинт отвечает ok с метриками", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.db).toBe("ok");
  expect(typeof body.uptimeSec).toBe("number");
  expect(typeof body.activeSessions).toBe("number");
});

test("client-config отдаёт поля для клиентского Sentry", async ({ request }) => {
  const res = await request.get("/api/client-config");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty("sentryDsn");
  expect(body).toHaveProperty("environment");
});
