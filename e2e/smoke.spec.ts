import { test, expect } from "@playwright/test";

// Дымовые проверки главного пути: сервер с БД поднялся, SPA смонтировалась,
// ключевые публичные экраны рендерятся без 500.

test("лендинг рендерится", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status() ?? 200).toBeLessThan(400);
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByText("Войти по коду").first()).toBeVisible();
  await expect(page.getByText("TessTOC — продукт Tess Technology")).toBeVisible();
  await expect(page.getByRole("link", { name: "Перейти на сайт компании Tess Technology" })).toHaveAttribute("href", "https://tesstech.ru/");
  await expect(page.getByRole("link", { name: /корпоративный мастер-класс/i }).first()).toHaveAttribute("href", /tesstech\.ru\/services\/the-theory-of-constraints-toc/);
});

test("публичные страницы отдают маршрутный SEO", async ({ request }) => {
  const docs = await request.get("/docs");
  expect(docs.status()).toBe(200);
  const html = await docs.text();
  expect(html).toContain("<title>Документация TessTOC 2.1</title>");
  expect(html).toContain('<link rel="canonical" href="https://toc.tesstech.ru/docs"');
  expect(html).toContain('id="seo-structured-data"');
  expect(docs.headers()["link"]).toContain("https://toc.tesstech.ru/docs");
});

test("неизвестная страница получает 404 и noindex", async ({ request }) => {
  const res = await request.get("/definitely-missing");
  expect(res.status()).toBe(404);
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  expect(await res.text()).toContain('name="robots" content="noindex,nofollow"');
});

test("служебные маршруты закрыты от индексации", async ({ request }) => {
  const trainer = await request.get("/trainer/login");
  expect(trainer.status()).toBe(200);
  expect(trainer.headers()["x-robots-tag"]).toContain("noindex");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("https://toc.tesstech.ru/docs");
  expect(xml).not.toContain("/trainer");
  expect(xml).not.toContain("/admin");
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
