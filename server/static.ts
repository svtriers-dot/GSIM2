import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { renderSeoHtml } from "./seo";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  const indexTemplate = fs.readFileSync(path.resolve(distPath, "index.html"), "utf8");

  // Для известных SPA-маршрутов отдаём route-aware SEO. Неизвестные URL
  // получают тот же React-экран 404, но с корректным HTTP 404 и noindex.
  app.use("/{*path}", (req, res) => {
    // В Express 5 req.path внутри смонтированного catch-all уже может быть "/".
    // originalUrl сохраняет фактический клиентский маршрут.
    const requestPath = new URL(req.originalUrl, "http://localhost").pathname;
    const { html, page, status } = renderSeoHtml(indexTemplate, requestPath);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    if (page.indexed && page.canonical) {
      res.setHeader("Link", `<${page.canonical}>; rel="canonical"`);
    } else {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    res.status(status).send(html);
  });
}
