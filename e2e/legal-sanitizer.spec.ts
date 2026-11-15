import { test, expect } from "@playwright/test";
import path from "node:path";

test("HTML sanitizer blocks active content and preserves legal documents", async ({ page }) => {
  await page.setContent('<!doctype html><div id="probe"></div>');
  await page.addScriptTag({ path: path.resolve("node_modules/dompurify/dist/purify.min.js") });
  const result = await page.evaluate(async () => {
    const purifier = (window as any).DOMPurify;
    const inputs = [
      '<script>window.__legalXss=1</script><p>Текст</p>',
      '<img src="data:," onerror="window.__legalXss=1">',
      '<p onclick="window.__legalXss=1">Текст</p>',
      '<a href="javascript:window.__legalXss=1">ссылка</a>',
      '<a href="&#106;avascript:window.__legalXss=1">ссылка</a>',
      '<svg onload="window.__legalXss=1"><g></g></svg>',
      '<iframe srcdoc="<script>parent.__legalXss=1</script>"></iframe>',
      '<math><mtext><img src="data:," onerror="window.__legalXss=1"></mtext></math>',
      '<object data="javascript:window.__legalXss=1"></object>',
      '<custom-widget onmouseover="window.__legalXss=1">Текст</custom-widget>',
      '<form id="attributes"><input name="__proto__"></form>',
    ];
    const host = document.getElementById("probe")!;
    for (const input of inputs) {
      (window as any).__legalXss = 0;
      host.innerHTML = purifier.sanitize(input, { USE_PROFILES: { html: true } });
      await new Promise(resolve => setTimeout(resolve, 20));
      if ((window as any).__legalXss !== 0 || host.querySelector("script,iframe,object,svg,math")) return false;
      for (const element of host.querySelectorAll("*")) {
        for (const name of element.getAttributeNames()) {
          if (/^on/i.test(name)) return false;
          if (/^(href|src)$/i.test(name) && /^\s*javascript:/i.test(element.getAttribute(name)!)) return false;
        }
      }
    }
    host.innerHTML = purifier.sanitize(
      '<h2>Раздел</h2><p><strong>Согласие</strong> «данные»</p>' +
      '<table><tr><td>Тариф</td><td>Стоимость</td></tr><tr><td>Базовый</td><td>100 ₽</td></tr></table>' +
      '<p><a href="https://tesstech.ru/">Компания</a> <a href="mailto:mail@tesstech.ru">Почта</a></p>',
      { USE_PROFILES: { html: true } },
    );
    return host.querySelector("h2")?.textContent === "Раздел" &&
      host.querySelector("strong")?.textContent === "Согласие" &&
      host.querySelectorAll("tr").length === 2 &&
      host.querySelectorAll("a[href]").length === 2;
  });
  expect(result).toBe(true);
});
