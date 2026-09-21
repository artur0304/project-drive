import * as fs from "fs";
import * as path from "path";
import { loadBakeoffManifest } from "./manifest";

const IMAGE_FILE = /\.(jpe?g|png|webp|heic)$/i;

export interface PhotoReadiness {
  total: number;
  target: number;
  stage1Ready: boolean;
  missing: { shadow: number; rear: number; wheelCloseup: number };
  unclassified: string[];
}

/** Считает manifest и новые файлы в папке приёма; изображение никуда не отправляется. */
export function analyzePhotoReadiness(manifestFile: string, inboxDir: string): PhotoReadiness {
  const { cases, coverage } = loadBakeoffManifest(manifestFile);
  fs.mkdirSync(inboxDir, { recursive: true });
  const known = new Set(cases.map((item) => path.resolve(item.sourceImage).toLowerCase()));
  const inbox = fs.readdirSync(inboxDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_FILE.test(entry.name))
    .map((entry) => ({ name: entry.name, fullPath: path.resolve(inboxDir, entry.name) }))
    .filter((entry) => !known.has(entry.fullPath.toLowerCase()));

  const existingShadow = countTags(coverage.tags, ["shadow", "shade"]);
  const existingRear = countTags(coverage.tags, ["rear-three-quarter", "rear", "back"]);
  const existingWheelCloseup = countTags(coverage.tags, ["wheel-close-up", "wheel-closeup", "close-wheels"]);
  const classified = inbox.map((entry) => ({ name: entry.name, ...classifyName(entry.name) }));
  return {
    total: coverage.uniquePhotos + inbox.length,
    target: 15,
    stage1Ready: coverage.uniquePhotos + inbox.length >= 2,
    missing: {
      shadow: Math.max(0, 2 - existingShadow - classified.filter((item) => item.shadow).length),
      rear: Math.max(0, 2 - existingRear - classified.filter((item) => item.rear).length),
      wheelCloseup: Math.max(0, 3 - existingWheelCloseup - classified.filter((item) => item.wheelCloseup).length),
    },
    unclassified: classified.filter((item) => !item.shadow && !item.rear && !item.wheelCloseup).map((item) => item.name),
  };
}

export function formatPhotoReadiness(status: PhotoReadiness): string {
  const lines = [
    `Фото: ${status.total} из ${status.target}.`,
    `Ступень 1: ${status.stage1Ready ? "ГОТОВО — двух фото достаточно." : `НЕ ГОТОВО — нужно ещё ${2 - status.total}.`}`,
  ];
  if (status.total < status.target) lines.push(`Для полного теста не хватает ещё ${status.target - status.total} фото.`);
  const needs = [
    status.missing.shadow ? `${status.missing.shadow} фото в тени` : "",
    status.missing.rear ? `${status.missing.rear} фото сзади` : "",
    status.missing.wheelCloseup ? `${status.missing.wheelCloseup} фото с крупно видимыми дисками` : "",
  ].filter(Boolean);
  lines.push(needs.length ? `Особенно нужны: ${needs.join(", ")}.` : "Нужные сложные ракурсы собраны.");
  if (status.unclassified.length) {
    lines.push(`Не удалось понять ракурс по имени: ${status.unclassified.join(", ")}. Добавь в имя shadow, rear или wheel-closeup.`);
  }
  return lines.join("\n");
}

function classifyName(name: string) {
  const normalized = name.toLowerCase();
  return {
    shadow: /(shadow|shade|ten|тень|тени)/u.test(normalized),
    rear: /(rear|back|zad|сзади|зад)/u.test(normalized),
    wheelCloseup: /(wheel.?close|close.?wheel|disk.?close|диск|колес)/u.test(normalized),
  };
}

function countTags(tags: Record<string, number>, names: string[]): number {
  return names.reduce((sum, name) => sum + (tags[name] ?? 0), 0);
}

if (require.main === module) {
  const manifestFile = path.resolve(__dirname, "../../../../bakeoff/cases.json");
  const inboxDir = path.resolve(__dirname, "../../../../bakeoff/new-photos");
  console.log(formatPhotoReadiness(analyzePhotoReadiness(manifestFile, inboxDir)));
  console.log(`Папка для новых снимков: ${inboxDir}`);
}
