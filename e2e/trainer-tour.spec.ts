import { devices, expect, test, type Page, type TestInfo } from "@playwright/test";

// Render the real dashboard with synthetic API responses. Never read or change
// existing trainers/sessions, including when this spec checks the published UI.
async function dashboard(page: Page, populated: boolean) {
  const trainer = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "trainer-layout-and-tour-check@example.invalid",
    name: "Тестовый тренер",
    organization: "Техническая проверка подсказок",
    role: "active",
  };
  const sessions = populated ? [{
    id: "22222222-2222-4222-8222-222222222222", name: "Тестовый мастер-класс",
    accessCode: "12345", status: "lobby", scenarioPreset: "medium", maxTeams: 20,
    startedAt: null, endedAt: null, expiresAt: "2026-12-01T12:00:00Z", createdAt: "2026-11-15T10:00:00Z",
  }] : [];
  let completed = 0;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ trainer }) => {
    localStorage.setItem("tesstoc:trainer:token", "synthetic-tour-ui-token");
    localStorage.setItem("tesstoc:trainer:profile", JSON.stringify(trainer));
  }, { trainer });
  await page.route("**/api/client-config", route => route.fulfill({ json: { sentryDsn: null, environment: "test" } }));
  await page.route("**/api/trainer/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && path === "/api/trainer/auth/me") {
      return route.fulfill({ json: { trainer, token: "synthetic-tour-ui-token" } });
    }
    if (request.method() === "GET" && path === "/api/trainer/sessions") {
      return route.fulfill({ json: { sessions } });
    }
    if (request.method() === "POST" && path === "/api/trainer/onboarding/tour-complete") {
      expect(request.headers().authorization).toBe("Bearer synthetic-tour-ui-token");
      completed++;
      return route.fulfill({ json: { ok: true } });
    }
    errors.push("Unexpected trainer request: " + request.method() + " " + path);
    return route.abort("blockedbyclient");
  });
  await page.goto("/trainer");
  const start = page.getByRole("button", { name: "Подсказки", exact: true });
  await expect(start).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  return { start, errors, completed: () => completed };
}

async function visibleStep(page: Page, title: string, info?: TestInfo, name?: string) {
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect.poll(async () => dialog.evaluate(element => {
    const b = element.getBoundingClientRect();
    return b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1;
  })).toBe(true);
  for (const button of await dialog.getByRole("button").all()) {
    await expect(button).toBeVisible();
    const inside = await button.evaluate(element => {
      const b = element.getBoundingClientRect();
      const p = element.closest('[role="alertdialog"]')!.getBoundingClientRect();
      return b.left >= p.left - 1 && b.right <= p.right + 1 && b.top >= p.top - 1 && b.bottom <= p.bottom + 1;
    });
    expect(inside).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await dialog.evaluate(element => getComputedStyle(element).fontFamily)).toBe(await page.evaluate(() => getComputedStyle(document.body).fontFamily));
  if (info && name) await page.screenshot({ path: info.outputPath(name + ".png"), animations: "disabled" });
  return dialog;
}

for (const width of [320, 390, 1280]) {
  for (const populated of [false, true]) {
    test(`tour ${width}px ${populated ? "sessions" : "empty"}: all steps, back, completion and restart`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      const state = await dashboard(page, populated);
      const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      await state.start.click();
      let dialog = await visibleStep(page, "Добро пожаловать в кабинет тренера", info, "step-1");
      await expect(dialog.getByTestId("button-primary")).toHaveText("Дальше (1 из 4)");
      await dialog.getByTestId("button-primary").click();
      dialog = await visibleStep(page, "Создать мастер-класс", info, "step-2");
      await expect(dialog).toContainText("5-значный код");
      await dialog.getByRole("button", { name: "Назад", exact: true }).click();
      dialog = await visibleStep(page, "Добро пожаловать в кабинет тренера");
      await dialog.getByTestId("button-primary").click();
      dialog = await visibleStep(page, "Создать мастер-класс");
      await dialog.getByTestId("button-primary").click();
      dialog = await visibleStep(page, "Список ваших сессий", info, "step-3");
      await dialog.getByTestId("button-primary").click();
      dialog = await visibleStep(page, "Готовы провести мастер-класс", info, "step-4");
      await expect(dialog.getByTestId("button-primary")).toHaveText("Готово");
      await dialog.getByTestId("button-primary").click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect.poll(state.completed).toBe(1);
      await state.start.click();
      await visibleStep(page, "Добро пожаловать в кабинет тренера");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      expect(state.completed()).toBe(1);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(background);
      expect(state.errors).toEqual([]);
    });
  }
}

test("tour: touch navigation on a mobile device", async ({ browser }, info) => {
  const context = await browser.newContext({
    ...devices["Pixel 5"], viewport: { width: 390, height: 844 },
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5000",
  });
  try {
    const page = await context.newPage();
    const state = await dashboard(page, false);
    await state.start.tap();
    for (const [index, title] of [
      "Добро пожаловать в кабинет тренера", "Создать мастер-класс",
      "Список ваших сессий", "Готовы провести мастер-класс",
    ].entries()) {
      const dialog = await visibleStep(page, title, info, "touch-step-" + index);
      await dialog.getByTestId("button-primary").tap();
    }
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect.poll(state.completed).toBe(1);
    expect(state.errors).toEqual([]);
  } finally { await context.close(); }
});

for (const width of [390, 1280]) {
  test(`tour ${width}px: skip records once and can restart`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await dashboard(page, false);
    for (const total of [1, 2]) {
      await state.start.click();
      const dialog = await visibleStep(page, "Добро пожаловать в кабинет тренера");
      await dialog.getByRole("button", { name: "Пропустить", exact: true }).click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect.poll(state.completed).toBe(total);
    }
    expect(state.errors).toEqual([]);
  });
}

for (const width of [320, 390, 1280]) {
  test(`tour ${width}px: keyboard focus, close and Escape cancel without completion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await dashboard(page, true);
    await state.start.click();
    let dialog = await visibleStep(page, "Добро пожаловать в кабинет тренера");
    await dialog.getByTestId("button-primary").focus();
    for (let n = 0; n < 6; n++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(state.completed()).toBe(0);
    await expect(state.start).toBeFocused();
    await state.start.click();
    dialog = await visibleStep(page, "Добро пожаловать в кабинет тренера");
    await dialog.getByTestId("button-primary").click();
    await visibleStep(page, "Создать мастер-класс");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(state.start).toBeFocused();
    expect(state.completed()).toBe(0);
    expect(state.errors).toEqual([]);
  });
}
