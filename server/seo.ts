import { getSeoPage, getStructuredData, isKnownClientPath, type SeoPage } from "@shared/seo";

const SEO_BLOCK = /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/;
const OG_IMAGE = "https://toc.tesstech.ru/og-tesstoc.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function structuredDataJson(page: SeoPage): string {
  return JSON.stringify(getStructuredData(page)).replace(/</g, "\\u003c");
}

export function renderSeoBlock(page: SeoPage): string {
  const robots = page.indexed ? "index,follow,max-image-preview:large" : "noindex,nofollow";
  const canonical = page.canonical
    ? `\n    <link rel="canonical" href="${escapeHtml(page.canonical)}" data-seo-managed="true" />`
    : "";
  const social = page.canonical
    ? `
    <meta property="og:type" content="${page.ogType}" data-seo-managed="true" />
    <meta property="og:site_name" content="TessTOC" data-seo-managed="true" />
    <meta property="og:locale" content="ru_RU" data-seo-managed="true" />
    <meta property="og:title" content="${escapeHtml(page.title)}" data-seo-managed="true" />
    <meta property="og:description" content="${escapeHtml(page.description)}" data-seo-managed="true" />
    <meta property="og:url" content="${escapeHtml(page.canonical)}" data-seo-managed="true" />
    <meta property="og:image" content="${OG_IMAGE}" data-seo-managed="true" />
    <meta property="og:image:width" content="1200" data-seo-managed="true" />
    <meta property="og:image:height" content="630" data-seo-managed="true" />
    <meta name="twitter:card" content="summary_large_image" data-seo-managed="true" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" data-seo-managed="true" />
    <meta name="twitter:description" content="${escapeHtml(page.description)}" data-seo-managed="true" />
    <meta name="twitter:image" content="${OG_IMAGE}" data-seo-managed="true" />
    <script id="seo-structured-data" type="application/ld+json">${structuredDataJson(page)}</script>`
    : "";

  return `<!-- SEO:START -->
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}" data-seo-managed="true" />
    <meta name="robots" content="${robots}" data-seo-managed="true" />${canonical}${social}
    <!-- SEO:END -->`;
}

export function renderSeoHtml(template: string, pathname: string): { html: string; page: SeoPage; status: number } {
  const page = getSeoPage(pathname);
  const status = isKnownClientPath(pathname) ? 200 : 404;
  const block = renderSeoBlock(page);
  const html = SEO_BLOCK.test(template)
    ? template.replace(SEO_BLOCK, block)
    : template.replace("</head>", `${block}\n  </head>`);

  return { html, page, status };
}
