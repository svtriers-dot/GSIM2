import { useEffect } from "react";
import { useLocation } from "wouter";
import { getSeoPage, getStructuredData } from "@shared/seo";

const OG_IMAGE = "https://toc.tesstech.ru/og-tesstoc.png";

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    node.dataset.seoManaged = "true";
    document.head.appendChild(node);
  }
  node.content = content;
}

function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
}

export default function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    const page = getSeoPage(window.location.pathname || location);
    document.title = page.title;
    setMeta('meta[name="description"]', "name", "description", page.description);
    setMeta('meta[name="robots"]', "name", "robots", page.indexed ? "index,follow,max-image-preview:large" : "noindex,nofollow");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (page.canonical) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        canonical.dataset.seoManaged = "true";
        document.head.appendChild(canonical);
      }
      canonical.href = page.canonical;

      const socialTags: Array<[string, string]> = [
        ["og:type", page.ogType],
        ["og:site_name", "TessTOC"],
        ["og:locale", "ru_RU"],
        ["og:title", page.title],
        ["og:description", page.description],
        ["og:url", page.canonical],
        ["og:image", OG_IMAGE],
        ["og:image:width", "1200"],
        ["og:image:height", "630"],
      ];
      for (const [key, value] of socialTags) setMeta(`meta[property="${key}"]`, "property", key, value);
      setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      setMeta('meta[name="twitter:title"]', "name", "twitter:title", page.title);
      setMeta('meta[name="twitter:description"]', "name", "twitter:description", page.description);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", OG_IMAGE);

      let structuredData = document.head.querySelector<HTMLScriptElement>("#seo-structured-data");
      if (!structuredData) {
        structuredData = document.createElement("script");
        structuredData.id = "seo-structured-data";
        structuredData.type = "application/ld+json";
        document.head.appendChild(structuredData);
      }
      structuredData.textContent = JSON.stringify(getStructuredData(page));
    } else {
      canonical?.remove();
      for (const key of ["og:type", "og:site_name", "og:locale", "og:title", "og:description", "og:url", "og:image", "og:image:width", "og:image:height"]) {
        removeMeta(`meta[property="${key}"]`);
      }
      for (const key of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
        removeMeta(`meta[name="${key}"]`);
      }
      document.head.querySelector("#seo-structured-data")?.remove();
    }
  }, [location]);

  return null;
}
