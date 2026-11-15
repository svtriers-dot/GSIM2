import { expect, test, type Page } from "@playwright/test";

async function dataApi(page: Page, failFirst: boolean) {
  const trainer = { id: "11111111-1111-4111-8111-111111111111", email: "query-loading@example.invalid",
    name: "Проверка загрузки", organization: "Синтетическая проверка", role: "active" };
  const session = { id: "22222222-2222-4222-8222-222222222222", name: "Проверка загруженных данных",
    accessCode: "12345", status: "lobby", scenarioPreset: "medium", maxTeams: 20,
    startedAt: null, endedAt: null, expiresAt: "2026-12-01T12:00:00Z", createdAt: "2026-11-15T10:00:00Z" };
  let release!: () => void, requests = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  const unexpected: string[] = [], errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(trainer => {
    localStorage.setItem("tesstoc:trainer:token", "synthetic-query-loading-token");
    localStorage.setItem("tesstoc:trainer:profile", JSON.stringify(trainer));
  }, trainer);
  // Intercept every API call, even when this checks the published interface.
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/client-config" && request.method() === "GET") return route.fulfill({ json: { sentryDsn: null, environment: "test" } });
    if (path === "/api/trainer/auth/me" && request.method() === "GET") return route.fulfill({ json: { trainer, token: "synthetic-query-loading-token" } });
    if (path === "/api/trainer/sessions" && request.method() === "GET") {
      expect(request.headers().authorization).toBe("Bearer synthetic-query-loading-token");
      requests++;
      if (requests === 1 && failFirst) return route.fulfill({ status: 503, body: "Synthetic temporary error" });
      if (requests === 1) await held;
      return route.fulfill({ json: { sessions: [session] } });
    }
    unexpected.push(request.method() + " " + path);
    return route.abort("blockedbyclient");
  });
  return { release, requests: () => requests, name: session.name, clean: () => {
    expect(unexpected).toEqual([]); expect(errors).toEqual([]);
    expect(page.url()).toMatch(/\/trainer$/);
  } };
}

for (const width of [390, 1280]) {
  test.describe(`data loading ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    test("loading indicator resolves to the fetched sessions", async ({ page }) => {
      const api = await dataApi(page, false);
      await page.goto("/trainer");
      const panel = page.getByRole("region", { name: "Список мастер-классов" });
      await expect(panel.locator(".animate-pulse").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Подсказки", exact: true })).toBeDisabled();
      await expect.poll(api.requests).toBe(1);
      api.release();
      await expect(panel.getByText(api.name, { exact: true })).toBeVisible();
      await expect(panel.locator(".animate-pulse")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Подсказки", exact: true })).toBeEnabled();
      expect(api.requests()).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      api.clean();
    });
    test("a manual retry replaces the error with successfully loaded data", async ({ page }) => {
      const api = await dataApi(page, true);
      await page.goto("/trainer");
      const retry = page.getByRole("button", { name: "↻ Повторить", exact: true });
      await expect(retry).toBeVisible();
      expect(api.requests()).toBe(1);
      await retry.click();
      await expect.poll(api.requests).toBe(2);
      await expect(page.getByText(api.name, { exact: true })).toBeVisible();
      await expect(retry).toHaveCount(0);
      await expect(page.getByText("Synthetic temporary error", { exact: false })).toHaveCount(0);
      expect(api.requests()).toBe(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      api.clean();
    });
  });
}
