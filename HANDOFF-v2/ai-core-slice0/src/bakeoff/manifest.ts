import * as fs from "fs";
import * as path from "path";
import type { OperationConfig, OperationKind } from "../types";
import type { BakeoffCase } from "./runBakeoff";

const OPERATION_KINDS: OperationKind[] = ["wrap", "tint", "wheel_recolor", "wheel_replace"];

interface RawCase {
  caseId?: unknown;
  photoLabel?: unknown;
  sourceImage?: unknown;
  operations?: unknown;
  tags?: unknown;
}

interface RawManifest {
  version?: unknown;
  target?: { minUniquePhotos?: unknown; minCasesPerOperation?: unknown };
  cases?: unknown;
}

export interface ManifestCoverage {
  uniquePhotos: number;
  totalCases: number;
  operationCases: Record<OperationKind, number>;
  tags: Record<string, number>;
  ready: boolean;
  gaps: string[];
}

export function loadBakeoffManifest(file: string): { cases: BakeoffCase[]; coverage: ManifestCoverage } {
  const manifestPath = path.resolve(file);
  const manifestDir = path.dirname(manifestPath);
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as RawManifest;
  if (raw.version !== 1) throw new Error("Bake-off manifest version must be 1");
  if (!Array.isArray(raw.cases) || raw.cases.length === 0) throw new Error("Bake-off manifest must contain cases");

  const ids = new Set<string>();
  const tags = new Map<string, number>();
  const cases = raw.cases.map((item, index) => parseCase(item as RawCase, index, manifestDir, ids, tags));
  const minUniquePhotos = positiveInteger(raw.target?.minUniquePhotos, 15);
  const minCasesPerOperation = positiveInteger(raw.target?.minCasesPerOperation, 5);
  const uniquePhotos = new Set(cases.map((item) => item.sourceImage)).size;
  const operationCases = Object.fromEntries(OPERATION_KINDS.map((kind) => [
    kind,
    cases.filter((item) => item.operations.some((operation) => operation.kind === kind)).length,
  ])) as Record<OperationKind, number>;
  const gaps: string[] = [];
  if (uniquePhotos < minUniquePhotos) gaps.push(`need ${minUniquePhotos - uniquePhotos} more unique car photos`);
  for (const kind of OPERATION_KINDS) {
    if (operationCases[kind] < minCasesPerOperation) {
      gaps.push(`${kind}: need ${minCasesPerOperation - operationCases[kind]} more cases`);
    }
  }

  return {
    cases,
    coverage: {
      uniquePhotos,
      totalCases: cases.length,
      operationCases,
      tags: Object.fromEntries([...tags.entries()].sort()),
      ready: gaps.length === 0,
      gaps,
    },
  };
}

function parseCase(raw: RawCase, index: number, baseDir: string, ids: Set<string>, tags: Map<string, number>): BakeoffCase {
  const label = `case #${index + 1}`;
  const caseId = requiredText(raw.caseId, `${label} caseId`);
  if (ids.has(caseId)) throw new Error(`Duplicate caseId: ${caseId}`);
  ids.add(caseId);
  const photoLabel = requiredText(raw.photoLabel, `${label} photoLabel`);
  const sourceImage = resolveExistingImage(raw.sourceImage, baseDir, `${label} sourceImage`);
  if (!Array.isArray(raw.operations) || raw.operations.length === 0) throw new Error(`${label} needs operations`);
  const operations = raw.operations.map((operation, operationIndex) =>
    parseOperation(operation, baseDir, `${label} operation #${operationIndex + 1}`));

  if (raw.tags != null && !Array.isArray(raw.tags)) throw new Error(`${label} tags must be an array`);
  for (const rawTag of (raw.tags as unknown[] | undefined) ?? []) {
    const tag = requiredText(rawTag, `${label} tag`);
    tags.set(tag, (tags.get(tag) ?? 0) + 1);
  }
  return { caseId, photoLabel, sourceImage, operations };
}

function parseOperation(raw: unknown, baseDir: string, label: string): OperationConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`${label} must be an object`);
  const value = raw as Record<string, unknown>;
  const kind = requiredText(value.kind, `${label} kind`) as OperationKind;
  if (!OPERATION_KINDS.includes(kind)) throw new Error(`${label} has unknown kind: ${kind}`);
  if (kind === "wrap") return {
    kind,
    finish: requiredChoice(value.finish, ["gloss", "satin", "matte", "metallic", "pearl"], `${label} finish`),
    colorName: requiredText(value.colorName, `${label} colorName`),
    colorHex: requiredHex(value.colorHex, `${label} colorHex`),
  };
  if (kind === "tint") return {
    kind,
    level: requiredChoice(value.level, ["none", "light", "medium", "limo", "blackout"], `${label} level`),
  };
  if (kind === "wheel_recolor") return {
    kind,
    colorName: requiredText(value.colorName, `${label} colorName`),
    colorHex: requiredHex(value.colorHex, `${label} colorHex`),
    finish: requiredChoice(value.finish, ["gloss", "satin", "matte", "chrome", "brushed"], `${label} finish`),
  };
  if (!Array.isArray(value.referenceImageUrls) || value.referenceImageUrls.length === 0) {
    throw new Error(`${label} needs referenceImageUrls`);
  }
  return {
    kind,
    wheelVariantId: requiredText(value.wheelVariantId, `${label} wheelVariantId`),
    label: requiredText(value.label, `${label} label`),
    referenceImageUrls: value.referenceImageUrls.map((image, imageIndex) =>
      resolveExistingImage(image, baseDir, `${label} reference #${imageIndex + 1}`)),
  };
}

function resolveExistingImage(value: unknown, baseDir: string, label: string): string {
  const relative = requiredText(value, label);
  const resolved = path.resolve(baseDir, relative);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error(`${label} does not exist: ${relative}`);
  if (!/\.(jpe?g|png|webp|heic)$/i.test(resolved)) throw new Error(`${label} is not a supported image: ${relative}`);
  return resolved;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be non-empty text`);
  return value.trim();
}

function requiredHex(value: unknown, label: string): string {
  const result = requiredText(value, label);
  if (!/^#[0-9a-f]{6}$/i.test(result)) throw new Error(`${label} must be #RRGGBB`);
  return result;
}

function requiredChoice<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
  return value as T;
}

function positiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
