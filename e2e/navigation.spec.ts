import { expect, test, type Page } from "@playwright/test";

// Every API request is intercepted, including when checking the published UI.
// Fixtures never authenticate against production or touch existing accounts.
async function syntheticApi(page: Page, role = "active") {
  const trainer = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "wouter-navigation@example.invalid",
    name: "Проверка навигации", organization: "Синтетическая проверка", role,
    createdAt: "2026-11-15T08:00:00Z",
  };
  const unexpected: string[] = [], errors: string[] = [], verifiedIds: string[] = [];
  let logins = 0;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname, method = request.method();
    if (path === "/api/client-config" && method === "GET") {
      return route.fulfill({ json: { sentryDsn: null, environment: "test" } });
    }
    if (path.startsWith("/api/verify/") && method === "GET") {
      verifiedIds.push(path.slice("/api/verify/".length));
      return route.fulfill({ json: { valid: false } });
    }
    if (path === "/api/trainer/auth/login" && method === "POST") {
      expect(request.postDataJSON()).toEqual({ email: trainer.email, password: "Synthetic-navigation-only-42" });
      logins++;
      return route.fulfill({ json: { token: "synthetic-navigation-token", trainer } });
    }
    if (path === "/api/trainer/auth/me" && method === "GET") {
      return route.fulfill({ json: { token: "synthetic-navigation-token", trainer } });
    }
    if (path === "/api/trainer/sessions" && method === "GET") return route.fulfill({ json: { sessions: [] } });
    if (path === "/api/trainer/onboarding/status" && method === "GET") {
      return route.fulfill({ json: {
        tourCompleted: false, quizPassed: false, quizScore: null, practicePlayed: false,
        practiceFinalCash: null, isCertified: false, certifiedAt: null,
        certificationPublicId: null, nextStep: "wait_approval", role,
      } });
    }
    unexpected.push(method + " " + path);
    return route.abort("blockedbyclient");
  });
  return { trainer, verifiedIds, logins: () => logins, clean: () => {
    expect(unexpected).toEqual([]); expect(errors).toEqual([]);
  } };
}

async function stampDocument(page: Page) {
  await page.evaluate(() => { (window as any).__wouterDocument = "same-document"; });
}
async function sameDocument(page: Page) {
  expect(await page.evaluate(() => (window as any).__wouterDocument)).toBe("same-document");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const width of [390, 1280]) {
  test.describe(`navigation ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: "reduce" });

    test("Link clicks, keyboard, Back and Forward preserve the SPA document", async ({ page }) => {
      const api = await syntheticApi(page);
      await page.goto("/docs");
      await expect(page.getByRole("heading", { name: "Документация TessTOC", exact: true })).toBeVisible();
      await stampDocument(page);
      await page.locator('header a[href="/about"]').first().click();
      await expect(page).toHaveURL(/\/about$/);
      await expect(page.locator("h1")).toBeVisible();
      await sameDocument(page);
      await page.goBack();
      await expect(page).toHaveURL(/\/docs$/);
      await expect(page.getByRole("heading", { name: "Документация TessTOC", exact: true })).toBeVisible();
      await sameDocument(page);
      await page.goForward();
      await expect(page).toHaveURL(/\/about$/);
      await page.locator('header a[href="/"]').first().focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator("h1")).toContainText("Освойте Теорию");
      await sameDocument(page);
      await page.locator('a[href="/play/join"]').filter({ hasText: "Войти по коду" }).first().click();
      await expect(page).toHaveURL(/\/play\/join$/);
      await expect(page.getByPlaceholder("12345")).toBeVisible();
      await sameDocument(page);
      api.clean();
    });

    test("pushState, replaceState, query, fragment and reload resolve the right page", async ({ page }) => {
      const api = await syntheticApi(page);
      await page.goto("/docs");
      await expect(page.locator("h1")).toHaveText("Документация TessTOC");
      await stampDocument(page);
      await page.evaluate(() => history.pushState({ source: "navigation-test" }, "", "/legal/privacy?source=wouter#policy"));
      await expect(page.locator("h1")).toHaveText("Политика обработки персональных данных");
      await expect(page).toHaveURL(/\/legal\/privacy\?source=wouter#policy$/);
      await sameDocument(page);
      await page.evaluate(() => history.replaceState({ source: "replace-test" }, "", "/docs?source=replaced#guide"));
      await expect(page.locator("h1")).toHaveText("Документация TessTOC");
      await sameDocument(page);
      const direct = page.url();
      const response = await page.reload();
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveText("Документация TessTOC");
      expect(page.url()).toBe(direct);
      api.clean();
    });

    test("dynamic publicId updates without leaking query or fragment into the parameter", async ({ page }) => {
      const api = await syntheticApi(page);
      await page.goto("/verify/synthetic-wouter-first?source=test#certificate");
      await expect(page.getByRole("heading", { name: "Сертификат не найден", exact: true })).toBeVisible();
      await stampDocument(page);
      await page.evaluate(() => history.pushState(null, "", "/verify/synthetic-wouter-second?source=next#certificate"));
      await expect.poll(() => api.verifiedIds).toContain("synthetic-wouter-second");
      expect(api.verifiedIds).toEqual(["synthetic-wouter-first", "synthetic-wouter-second"]);
      await sameDocument(page);
      api.clean();
    });

    test("protected routes redirect to login, and an unknown page recovers through Link", async ({ page }) => {
      const api = await syntheticApi(page);
      for (const route of ["/trainer", "/trainer/sessions/synthetic-wouter-session"]) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/trainer\/login$/);
        await expect(page.locator('input[type="email"]')).toBeVisible();
      }
      const missing = await page.goto("/synthetic-wouter-missing");
      expect(missing?.status()).toBeLessThan(500);
      await expect(page.locator("h1")).toContainText("404");
      await stampDocument(page);
      await page.getByRole("link", { name: "← На главную", exact: true }).click();
      await expect(page.locator("h1")).toContainText("Освойте Теорию");
      await sameDocument(page);
      api.clean();
    });

    for (const [role, route, heading] of [
      ["active", "/trainer", "TessTOC · Кабинет тренера"],
      ["pending", "/trainer/onboarding", "Онбординг тренера"],
      ["suspended", "/trainer/pending", "Учётная запись приостановлена"],
    ]) {
      test(`login navigation for ${role} uses only synthetic API responses`, async ({ page }) => {
        const api = await syntheticApi(page, role);
        await page.goto("/trainer/login");
        await page.locator('input[type="email"]').fill(api.trainer.email);
        await page.locator('input[type="password"]').fill("Synthetic-navigation-only-42");
        await stampDocument(page);
        await page.locator('form button[type="submit"]').click();
        await expect(page).toHaveURL(new RegExp(route + "$"));
        await expect(page.locator("h1")).toHaveText(heading);
        expect(api.logins()).toBe(1);
        await sameDocument(page);
        api.clean();
      });
    }
  });
}
