import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { INDEXED_PATHS, TESS_TECH_URL, TESS_TOC_VERSION, getSeoPage, getStructuredData, isKnownClientPath } from "../shared/seo";
import { renderSeoHtml } from "../server/seo";

const templatePath = fileURLToPath(new URL("../client/index.html", import.meta.url));
const template = readFileSync(templatePath, "utf8");

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(name: string, condition: boolean) {
  if (condition) pass++;
  else {
    fail++;
    failures.push(name);
  }
}

const pages = INDEXED_PATHS.map(getSeoPage);
ok("все индексируемые страницы имеют уникальные title", new Set(pages.map((page) => page.title)).size === pages.length);
ok("все индексируемые страницы имеют уникальные description", new Set(pages.map((page) => page.description)).size === pages.length);
ok("все индексируемые страницы имеют canonical", pages.every((page) => page.canonical?.startsWith("https://toc.tesstech.ru/")));
ok("docs содержит версию 2.1", getSeoPage("/docs").title.includes("2.1"));

const docs = renderSeoHtml(template, "/docs?source=test");
ok("docs отдаётся с HTTP 200", docs.status === 200);
ok("docs получает свой title", docs.html.includes("<title>Документация TessTOC 2.1</title>"));
ok("docs получает свой canonical", docs.html.includes('rel="canonical" href="https://toc.tesstech.ru/docs"'));
ok("docs получает JSON-LD", docs.html.includes('id="seo-structured-data"'));

const missing = renderSeoHtml(template, "/not-a-real-page");
ok("неизвестный маршрут получает HTTP 404", missing.status === 404);
ok("неизвестный маршрут закрыт noindex", missing.html.includes('name="robots" content="noindex,nofollow"'));
ok("неизвестный маршрут не получает canonical", !missing.html.includes('rel="canonical"'));

const trainer = renderSeoHtml(template, "/trainer/login");
ok("служебный маршрут остаётся доступным", trainer.status === 200 && isKnownClientPath("/trainer/login"));
ok("служебный маршрут закрыт noindex", trainer.html.includes('name="robots" content="noindex,nofollow"'));

const graph = getStructuredData(getSeoPage("/"));
const graphJson = JSON.stringify(graph);
ok("JSON-LD связывает продукт с Tess Technology", graphJson.includes(TESS_TECH_URL));
ok("JSON-LD содержит версию продукта", graphJson.includes(`\"softwareVersion\":\"${TESS_TOC_VERSION}\"`));

for (const [file, required] of [
  ["Landing.tsx", ["CorporateBrandBar", "TOC_SERVICE_URL", "CORPORATE_MASTERCLASS_URL"]],
  ["About.tsx", ["CorporateBrandBar", "COMPANY_REQUISITES_URL", "CORPORATE_MASTERCLASS_URL"]],
  ["Documentation.tsx", ["CorporateBrandBar", "TOC_SERVICE_URL"]],
  ["LegalPage.tsx", ["CorporateBrandBar", "COMPANY_REQUISITES_URL"]],
] as const) {
  const source = readFileSync(fileURLToPath(new URL(`../client/src/pages/${file}`, import.meta.url)), "utf8");
  ok(`${file} содержит корпоративную навигацию`, required.every((value) => source.includes(value)));
}

console.log(`\n===== SEO AND CORPORATE LINKS: ${pass} passed, ${fail} failed =====`);
if (failures.length) {
  console.log("FAILED:");
  for (const failure of failures) console.log(`  ✗ ${failure}`);
}
if (fail > 0) process.exit(1);
