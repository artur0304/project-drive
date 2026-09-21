import type { OperationConfig, OperationKind } from "../types";
import type { BakeoffCase } from "./runBakeoff";

export type BakeoffStage = "stage1" | "stage2" | "stage3";
export const ALL_OPERATIONS: OperationKind[] = ["wrap", "tint", "wheel_recolor", "wheel_replace"];

/**
 * Этап 1: две машины, четыре операции по отдельности, один кандидат = 8 вызовов.
 * Разделение операций показывает, какая именно правка проходит порог качества.
 */
export function buildStage1Cases(sourceCases: BakeoffCase[]): BakeoffCase[] {
  return buildIndividualOperationCases(sourceCases, 2, ALL_OPERATIONS);
}

/**
 * Этап 2: три машины и только операции, которые человек признал прошедшими
 * после слепой оценки первого этапа. При двух кандидатах это максимум 24 вызова.
 */
export function buildStage2Cases(sourceCases: BakeoffCase[], passedOperations: OperationKind[]): BakeoffCase[] {
  if (passedOperations.length === 0) throw new Error("Stage 2 needs at least one human-approved operation from Stage 1");
  return buildIndividualOperationCases(sourceCases, 3, uniqueOperations(passedOperations));
}

/** Этап 3 использует полный manifest без сокращений и запускается отдельной командой. */
export function buildStage3Cases(sourceCases: BakeoffCase[]): BakeoffCase[] {
  return sourceCases.map(cloneCase);
}

export function parseOperationList(value: string | undefined): OperationKind[] {
  const items = (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const invalid = items.filter((item) => !ALL_OPERATIONS.includes(item as OperationKind));
  if (invalid.length) throw new Error(`Unknown operations: ${invalid.join(", ")}`);
  return uniqueOperations(items as OperationKind[]);
}

function buildIndividualOperationCases(sourceCases: BakeoffCase[], photoCount: number, operations: OperationKind[]): BakeoffCase[] {
  const photos = uniquePhotos(sourceCases).slice(0, photoCount);
  if (photos.length < photoCount) throw new Error(`Stage needs ${photoCount} unique car photos; found ${photos.length}`);
  return photos.flatMap((sourceCase, photoIndex) => operations.map((kind) => ({
    caseId: `stage-photo-${photoIndex + 1}-${kind}`,
    photoLabel: sourceCase.photoLabel,
    sourceImage: sourceCase.sourceImage,
    operations: [operationFor(kind, sourceCase, sourceCases)],
  })));
}

function operationFor(kind: OperationKind, sourceCase: BakeoffCase, allCases: BakeoffCase[]): OperationConfig {
  const existing = sourceCase.operations.find((operation) => operation.kind === kind)
    ?? allCases.flatMap((item) => item.operations).find((operation) => operation.kind === kind);
  if (existing) return structuredClone(existing);
  if (kind === "wheel_recolor") {
    return { kind, colorName: "Satin Black", colorHex: "#15171A", finish: "satin" };
  }
  throw new Error(`Manifest has no configuration for required operation: ${kind}`);
}

function uniquePhotos(cases: BakeoffCase[]): BakeoffCase[] {
  const seen = new Set<string>();
  return cases.filter((item) => !seen.has(item.sourceImage) && Boolean(seen.add(item.sourceImage)));
}

function uniqueOperations(operations: OperationKind[]): OperationKind[] {
  return [...new Set(operations)];
}

function cloneCase(value: BakeoffCase): BakeoffCase {
  return structuredClone(value);
}
