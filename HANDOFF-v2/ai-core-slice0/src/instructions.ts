// ============================================================================
// Сборка текст-инструкции из structured draft + сбор reference-картинок.
// Принцип ТЗ: preservation-first — модели явно говорим сохранить всё остальное.
// Для дисков передаём reference image, а не только название.
// ============================================================================

import type { OperationConfig, OperationKind } from "./types";

const PRESERVE_CLAUSE =
  "Keep the exact same car, camera angle, background, lighting, body geometry, " +
  "headlights, reflections and every detail that is not explicitly changed below. " +
  "Do not alter anything else.";

function tintPhrase(level: string): string {
  switch (level) {
    case "none": return "remove any window tint (clear glass)";
    case "light": return "apply light window tint (about 50% VLT)";
    case "medium": return "apply medium window tint (about 35% VLT)";
    case "limo": return "apply dark limo window tint (about 20% VLT)";
    case "blackout": return "apply full black-out window tint (about 5% VLT)";
    default: return "adjust window tint";
  }
}

function oneInstruction(op: OperationConfig): string {
  switch (op.kind) {
    case "wrap":
      return `Change the body wrap to ${op.colorName} (${op.colorHex}) with a ${op.finish} finish.`;
    case "tint":
      return `${tintPhrase(op.level).charAt(0).toUpperCase()}${tintPhrase(op.level).slice(1)}.`;
    case "wheel_recolor":
      return `Recolor the existing wheels to ${op.colorName} (${op.colorHex}) with a ${op.finish} finish, keeping the same wheel design.`;
    case "wheel_replace":
      return `Replace the wheels with the wheel shown in the reference image (${op.label}), matching its exact design and fitting the car's perspective.`;
    default:
      return "";
  }
}

export interface BuiltInstruction {
  text: string;
  referenceImages: string[];
  operationKinds: OperationKind[];
}

/** Собрать единую инструкцию из набора операций (для batch-генерации через Planner). */
export function buildInstruction(ops: OperationConfig[]): BuiltInstruction {
  const lines = ops.map(oneInstruction).filter(Boolean);
  const refs: string[] = [];
  for (const op of ops) {
    if (op.kind === "wheel_replace") refs.push(...op.referenceImageUrls);
  }
  const text = `${lines.join(" ")}\n\n${PRESERVE_CLAUSE}`;
  return {
    text,
    referenceImages: refs,
    operationKinds: ops.map((o) => o.kind),
  };
}
