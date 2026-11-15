import { expect, test, type Page, type Request, type Route } from "@playwright/test";

type Reply = Parameters<Route["fulfill"]>[0];
const password = "Synthetic-form-only-42";
async function isolatedApi(page: Page, handler: (request: Request) => Promise<Reply | undefined>, signedIn = false, role = "active") {
  const trainer = { id: "11111111-1111-4111-8111-111111111111", email: "forms@example.invalid",
    name: "Проверка форм", organization: "Синтетическая проверка", role };
  const unexpected: string[] = [], errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  if (signedIn) await page.addInitScript(trainer => {
    localStorage.setItem("tesstoc:trainer:token", "synthetic-forms-token");
    localStorage.setItem("tesstoc:trainer:profile", JSON.stringify(trainer));
  }, trainer);
  // All API traffic is intercepted, including when checking the published UI.
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === "GET") {
      if (path === "/api/client-config") return route.fulfill({ json: { sentryDsn: null, environment: "test" } });
      if (path === "/api/trainer/auth/me") return route.fulfill({ json: { trainer, token: "synthetic-forms-token" } });
      if (path === "/api/trainer/sessions") return route.fulfill({ json: { sessions: [] } });
      if (path === "/api/trainer/onboarding/status") return route.fulfill({ json: {
        tourCompleted: false, quizPassed: false, quizScore: null, practicePlayed: false,
        practiceFinalCash: null, isCertified: false, certifiedAt: null,
        certificationPublicId: null, nextStep: "wait_approval", role,
      } });
    }
    const response = await handler(request);
    if (response) return route.fulfill(response);
    unexpected.push(request.method() + " " + path);
    return route.abort("blockedbyclient");
  });
  return { trainer, clean: async () => {
    expect(unexpected).toEqual([]); expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } };
}

for (const width of [390, 1280]) {
  test.describe(`forms ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: "reduce" });

    test("login validates fields and recovers after a rejected submission", async ({ page }, info) => {
      const bodies: unknown[] = [];
      const api = await isolatedApi(page, async request => {
        if (new URL(request.url()).pathname !== "/api/trainer/auth/login" || request.method() !== "POST") return;
        bodies.push(request.postDataJSON());
        return bodies.length === 1 ? { status: 401, json: { error: "invalid_credentials" } } : { json: { token: "synthetic-forms-token", trainer: api.trainer } };
      });
      await page.goto("/trainer/login");
      const submit = page.locator('form button[type="submit"]');
      await page.locator('input[type="email"]').fill("invalid-email");
      await page.locator('input[type="password"]').fill(password);
      await submit.click(); expect(bodies).toHaveLength(0);
      await page.locator('input[type="email"]').fill(api.trainer.email);
      await page.locator('input[type="password"]').fill("short");
      await submit.click(); expect(bodies).toHaveLength(0);
      await page.locator('input[type="password"]').fill(password);
      await submit.click();
      await expect(page.getByText("Неверный email или пароль", { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath("login.png"), animations: "disabled" });
      await submit.click();
      await expect(page).toHaveURL(/\/trainer$/);
      await expect(page.locator("h1")).toHaveText("TessTOC · Кабинет тренера");
      expect(bodies).toEqual([{ email: api.trainer.email, password }, { email: api.trainer.email, password }]);
      await api.clean();
    });

    test("registration requires legal consent and preserves the separate public-profile choice", async ({ page }, info) => {
      const bodies: any[] = [];
      const api = await isolatedApi(page, async request => {
        if (new URL(request.url()).pathname !== "/api/trainer/auth/register" || request.method() !== "POST") return;
        bodies.push(request.postDataJSON());
        return bodies.length === 1 ? { status: 409, json: { error: "trainer_exists" } } : { json: { token: "synthetic-forms-token", trainer: api.trainer } };
      }, false, "pending");
      await page.goto("/trainer/login");
      await page.getByRole("button", { name: "Регистрация", exact: true }).click();
      await page.getByPlaceholder("Иванов Иван Иванович").fill("Проверка регистрации");
      await page.getByPlaceholder("Название компании").fill("Синтетическая организация");
      await page.locator('input[type="email"]').fill(api.trainer.email);
      await page.locator('input[type="password"]').fill(password);
      const submit = page.locator('form button[type="submit"]'), boxes = page.locator('form input[type="checkbox"]');
      await expect(submit).toBeDisabled(); await expect(boxes.nth(0)).not.toBeChecked(); await expect(boxes.nth(1)).not.toBeChecked();
      expect(bodies).toHaveLength(0);
      await boxes.nth(0).check(); await expect(submit).toBeEnabled();
      await submit.click();
      await expect(page.getByText("Тренер с таким email уже зарегистрирован", { exact: true })).toBeVisible();
      expect(bodies[0]).toMatchObject({ legalAccepted: true, publicProfileConsent: false, email: api.trainer.email });
      await page.locator('input[type="email"]').fill("forms-alternate@example.invalid");
      await boxes.nth(1).check();
      await page.screenshot({ path: info.outputPath("registration.png"), animations: "disabled" });
      await submit.click();
      await expect(page).toHaveURL(/\/trainer\/onboarding$/);
      await expect(page.locator("h1")).toHaveText("Онбординг тренера");
      expect(bodies).toHaveLength(2);
      expect(bodies[1]).toMatchObject({ legalAccepted: true, publicProfileConsent: true, email: "forms-alternate@example.invalid" });
      await api.clean();
    });

    test("team form validates the code, members and data-basis confirmation", async ({ page }, info) => {
      const joins: any[] = [];
      const api = await isolatedApi(page, async request => {
        const url = new URL(request.url());
        if (url.pathname === "/api/teams/check" && request.method() === "GET") return { json: url.searchParams.get("code") === "12345" ? { exists: true, name: "Синтетический мастер-класс", status: "lobby" } : { exists: false } };
        if (url.pathname === "/api/teams/join" && request.method() === "POST") {
          joins.push(request.postDataJSON()); return { status: 409, json: { error: "team_name_taken" } };
        }
      });
      await page.goto("/play/join");
      const code = page.getByPlaceholder("12345"), next = page.getByRole("button", { name: "Дальше →", exact: true });
      await code.fill("1234"); await expect(next).toBeDisabled();
      await code.fill("11111"); await next.click();
      await expect(page.getByText("Сессия с таким кодом не найдена или уже завершена", { exact: true })).toBeVisible();
      await code.fill(""); await code.pressSequentially("ab12345x"); await expect(code).toHaveValue("12345"); await next.click();
      await page.getByPlaceholder("Зелёные орлы").fill("Синтетическая команда");
      const submit = page.getByRole("button", { name: "Подключиться к мастер-классу", exact: true });
      await expect(submit).toBeDisabled();
      await page.locator('form input[type="checkbox"]').check(); await submit.click();
      await expect(page.getByText("Добавьте хотя бы одно ФИО", { exact: true })).toBeVisible(); expect(joins).toHaveLength(0);
      await page.getByPlaceholder("Иванов Иван Иванович").fill("Синтетический участник");
      await page.getByRole("button", { name: "+ добавить ещё", exact: true }).click();
      await page.getByPlaceholder("Иванов Иван Иванович").nth(1).fill("Лишняя тестовая строка");
      await page.getByRole("button", { name: "×", exact: true }).last().click();
      await page.screenshot({ path: info.outputPath("team.png"), animations: "disabled" });
      await submit.click();
      await expect(page.getByText("Такое название команды уже занято — выберите другое", { exact: true })).toBeVisible();
      expect(joins).toEqual([{ code: "12345", teamName: "Синтетическая команда", members: [{ fullName: "Синтетический участник" }], dataBasisConfirmed: true }]);
      await expect(page.getByPlaceholder("Зелёные орлы")).toHaveValue("Синтетическая команда");
      await api.clean();
    });

    test("new session validates limits, serializes custom settings and blocks duplicate submits", async ({ page }, info) => {
      const creates: any[] = []; let release!: () => void;
      const held = new Promise<void>(resolve => { release = resolve; });
      const api = await isolatedApi(page, async request => {
        if (new URL(request.url()).pathname !== "/api/trainer/sessions" || request.method() !== "POST") return;
        expect(request.headers().authorization).toBe("Bearer synthetic-forms-token");
        creates.push(request.postDataJSON()); await held; return { status: 503, json: { error: "synthetic_unavailable" } };
      }, true);
      await page.goto("/trainer/sessions/new");
      const submit = page.getByRole("button", { name: "Создать сессию", exact: true });
      await submit.click(); expect(creates).toHaveLength(0);
      await page.getByPlaceholder("Мастер-класс ТОС, ВТБ 06.05").fill("Проверка параметров формы");
      const numbers = page.locator('input[type="number"]');
      await numbers.nth(0).fill("101"); await submit.click(); expect(creates).toHaveLength(0);
      await numbers.nth(0).fill("12"); await numbers.nth(1).fill("169"); await submit.click(); expect(creates).toHaveLength(0);
      await numbers.nth(1).fill("48"); await page.locator("select").selectOption("custom");
      const custom = page.getByPlaceholder("из пресета");
      for (const [i, value] of ["15000", "10000", "5", "120"].entries()) await custom.nth(i).fill(value);
      await page.screenshot({ path: info.outputPath("new-session.png"), animations: "disabled" });
      await submit.click(); await expect.poll(() => creates.length).toBe(1);
      await expect(page.getByRole("button", { name: "Создаю...", exact: true })).toBeDisabled();
      release();
      await expect(page.getByText("synthetic_unavailable", { exact: false })).toBeVisible();
      await expect(submit).toBeEnabled();
      expect(creates).toEqual([{ name: "Проверка параметров формы", scenarioPreset: "custom", maxTeams: 12, expiresInHours: 48, configOverrides: { startingCash: 15000, fixedExpenses: 10000, totalDays: 5, dayDurationSeconds: 120 } }]);
      await api.clean();
    });
  });
}
