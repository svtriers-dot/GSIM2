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
  await expect(page.getByPlaceholder("ABC123")).toBeVisible();
});

test("верификация несуществующего сертификата не падает (нет 500)", async ({ page }) => {
  const res = await page.goto("/verify/doesnotexist");
  expect(res?.status() ?? 200).toBeLessThan(500);
  await expect(page.locator("#root")).not.toBeEmpty();
});
