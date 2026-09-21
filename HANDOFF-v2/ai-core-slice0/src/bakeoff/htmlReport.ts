import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import type { BakeoffRow } from "./runBakeoff";

/**
 * Создаёт автономную страницу для просмотра результатов bake-off.
 * Внешних библиотек и сетевых ресурсов нет: HTML открывается локально,
 * а сохранённые результаты берутся из соседней папки images/.
 */
export function writeHtmlReport(rows: BakeoffRow[], outDir: string): string {
  const file = path.join(outDir, "bakeoff_report.html");
  const cards = rows.map((row) => renderCard(row, outDir)).join("\n");
  const totalCost = rows.reduce((sum, row) => sum + row.totalInternalCostUsd, 0);
  const successCount = rows.filter((row) => row.ok).length;
  const generatedAt = new Date().toISOString();

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Project Drive — bake-off report</title>
  <style>
    :root { color-scheme: dark; --bg:#0d0f12; --panel:#171a1f; --line:#2a3038; --muted:#9ca6b5; --ok:#54d38a; --bad:#ff6b78; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:#f4f6f8; font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif; }
    main { max-width:1440px; margin:auto; padding:28px; }
    h1 { margin:0 0 8px; font-size:28px; }
    .summary { color:var(--muted); margin-bottom:24px; }
    .grid { display:grid; gap:18px; }
    article { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; }
    article header { display:flex; gap:12px; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
    h2 { margin:0; font-size:18px; }
    .status { font-weight:700; color:var(--ok); } .status.bad { color:var(--bad); }
    .images { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    figure { margin:0; min-width:0; }
    figcaption { color:var(--muted); margin-bottom:6px; }
    img { display:block; width:100%; height:min(42vw,480px); object-fit:contain; background:#090a0c; border-radius:9px; }
    .missing { height:240px; display:grid; place-items:center; background:#090a0c; color:var(--muted); border-radius:9px; }
    dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 12px; margin:14px 0 0; }
    dt { color:var(--muted); } dd { margin:0; overflow-wrap:anywhere; }
    @media (max-width:760px) { main{padding:14px}.images{grid-template-columns:1fr} img{height:60vw} article header{display:block}.status{display:block;margin-top:6px} }
  </style>
</head>
<body><main>
  <h1>Project Drive — bake-off</h1>
  <div class="summary">Создан: ${escapeHtml(generatedAt)} · Успешно: ${successCount}/${rows.length} · Расход: $${totalCost.toFixed(4)}</div>
  <section class="grid">${cards || "<p>Нет результатов.</p>"}</section>
</main></body></html>`;
  fs.writeFileSync(file, html, "utf8");
  return file;
}

function renderCard(row: BakeoffRow, outDir: string): string {
  return `<article>
    <header><h2>${escapeHtml(row.photoLabel)} · ${escapeHtml(row.operationKinds.join(" + "))}</h2><span class="status${row.ok ? "" : " bad"}">${row.ok ? "SUCCESS" : "FAILED"}</span></header>
    <div class="images">
      ${renderImage("Исходное фото", row.sourceImage, outDir)}
      ${row.outputImage ? renderImage("Результат", row.outputImage, outDir) : '<figure><figcaption>Результат</figcaption><div class="missing">Изображение не создано</div></figure>'}
    </div>
    <dl>
      <dt>Кейс</dt><dd>${escapeHtml(row.caseId)}</dd>
      <dt>Кандидат</dt><dd>${escapeHtml(row.candidate)}</dd>
      <dt>Провайдер</dt><dd>${escapeHtml(row.provider)}</dd>
      <dt>Попытки</dt><dd>${row.attemptsCount}</dd>
      <dt>Задержка</dt><dd>${row.totalLatencyMs} ms</dd>
      <dt>Стоимость</dt><dd>$${row.totalInternalCostUsd.toFixed(4)}</dd>
      ${row.failureReason ? `<dt>Ошибка</dt><dd>${escapeHtml(row.failureReason)}</dd>` : ""}
    </dl>
  </article>`;
}

function renderImage(label: string, source: string, outDir: string): string {
  const href = imageHref(source, outDir);
  if (!href) return `<figure><figcaption>${escapeHtml(label)}</figcaption><div class="missing">Локальное изображение недоступно</div></figure>`;
  return `<figure><figcaption>${escapeHtml(label)}</figcaption><img src="${escapeHtml(href)}" alt="${escapeHtml(label)}" loading="lazy"></figure>`;
}

function imageHref(source: string, outDir: string): string | null {
  if (/^data:image\//i.test(source) || /^https?:\/\//i.test(source)) return source;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) return null;
  const resolved = path.isAbsolute(source) ? source : path.resolve(outDir, source);
  return fs.existsSync(resolved) ? pathToFileURL(resolved).href : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}
