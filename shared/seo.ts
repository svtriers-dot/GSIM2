export const TESS_TOC_URL = "https://toc.tesstech.ru";
export const TESS_TECH_URL = "https://tesstech.ru";
export const TESS_TOC_VERSION = "2.1";

export interface SeoPage {
  path: string;
  title: string;
  description: string;
  canonical?: string;
  indexed: boolean;
  ogType: "website" | "article";
}

const indexedPages: Record<string, Omit<SeoPage, "path" | "canonical" | "indexed">> = {
  "/": {
    title: "TessTOC — симулятор Теории ограничений",
    description: "Практический веб-симулятор Теории ограничений: управляйте фабрикой, находите узкое место и оптимизируйте продуктовый микс.",
    ogType: "website",
  },
  "/play": {
    title: "Играть в симулятор Теории ограничений | TessTOC",
    description: "Пройдите производственную симуляцию TessTOC: найдите системное ограничение, управляйте потоком и улучшите финансовый результат.",
    ogType: "website",
  },
  "/about": {
    title: "О программе TessTOC — версия 2.1",
    description: "Карточка программного обеспечения TessTOC: назначение, версия 2.1, реквизиты заявителя, технический стек и юридические документы.",
    ogType: "article",
  },
  "/docs": {
    title: "Документация TessTOC 2.1",
    description: "Функциональные характеристики, состав, системные требования, установка, эксплуатация и жизненный цикл программного обеспечения TessTOC.",
    ogType: "article",
  },
  "/legal/eula": {
    title: "Лицензионное соглашение TessTOC",
    description: "Лицензионное соглашение с конечным пользователем программного обеспечения TessTOC.",
    ogType: "article",
  },
  "/legal/oferta": {
    title: "Публичная оферта TessTOC",
    description: "Условия приобретения прав использования программного обеспечения TessTOC, тарифы и порядок расчётов.",
    ogType: "article",
  },
  "/legal/privacy": {
    title: "Политика обработки персональных данных TessTOC",
    description: "Политика обработки персональных данных пользователей программного обеспечения и сайта TessTOC.",
    ogType: "article",
  },
};

export const INDEXED_PATHS = Object.freeze(Object.keys(indexedPages));

export function normalizeSeoPath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  if (path === "/") return path;
  return path.replace(/\/+$/, "") || "/";
}

export function getSeoPage(pathname: string): SeoPage {
  const path = normalizeSeoPath(pathname);
  const page = indexedPages[path];
  if (page) {
    return {
      path,
      ...page,
      canonical: `${TESS_TOC_URL}${path === "/" ? "/" : path}`,
      indexed: true,
    };
  }

  return {
    path,
    title: path.startsWith("/play") || path.startsWith("/trainer") || path.startsWith("/admin")
      ? "TessTOC — рабочий раздел"
      : "Страница не найдена | TessTOC",
    description: "TessTOC — веб-симулятор Теории ограничений.",
    indexed: false,
    ogType: "website",
  };
}

export function isKnownClientPath(pathname: string): boolean {
  const path = normalizeSeoPath(pathname);
  if (indexedPages[path]) return true;

  return ["/play/", "/verify/", "/trainer", "/admin"].some((prefix) =>
    path === prefix.replace(/\/$/, "") || path.startsWith(prefix),
  );
}

export function getStructuredData(page: SeoPage): Record<string, unknown> | null {
  if (!page.indexed || !page.canonical) return null;

  const organizationId = `${TESS_TECH_URL}/#organization`;
  const applicationId = `${TESS_TOC_URL}/#software`;
  const websiteId = `${TESS_TOC_URL}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "ООО «ТЕСС ТЕХНОЛОДЖИ»",
        alternateName: "Tess Technology",
        url: TESS_TECH_URL,
        email: "mail@tesstech.ru",
        telephone: "+7-916-729-07-16",
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "TessTOC",
        url: `${TESS_TOC_URL}/`,
        inLanguage: "ru-RU",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "SoftwareApplication",
        "@id": applicationId,
        name: "TessTOC — Симулятор Теории ограничений",
        applicationCategory: "EducationalApplication",
        applicationSubCategory: "BusinessSimulation",
        operatingSystem: "Web",
        softwareVersion: TESS_TOC_VERSION,
        url: `${TESS_TOC_URL}/`,
        description: indexedPages["/"].description,
        inLanguage: "ru-RU",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebPage",
        "@id": `${page.canonical}#webpage`,
        url: page.canonical,
        name: page.title,
        description: page.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": websiteId },
        about: { "@id": applicationId },
      },
    ],
  };
}
