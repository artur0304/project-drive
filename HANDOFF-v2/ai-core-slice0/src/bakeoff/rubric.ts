// ============================================================================
// Рубрика качества и пороги для bake-off (ТЗ раздел 3).
// Оценка РУЧНАЯ: человек смотрит рендер и ставит 1..5 по каждому критерию.
// Acceptance = средний балл >= ACCEPT_MIN. Go/no-go по фиче = доля принятых >= PASS_RATE.
// Пороги стартовые — подвинем по реальным данным.
// ============================================================================

export const COMMON_RUBRIC_CRITERIA = [
  "car_identity_preserved",
  "geometry_preserved",
  "background_preserved",
  "lighting_believable",
  "target_modification_accurate",
  "no_unwanted_changes",
] as const;

export const WHEEL_RUBRIC_CRITERIA = [
  "wheel_perspective",
  "wheel_design_fidelity",
] as const;

export const RUBRIC_CRITERIA = [...COMMON_RUBRIC_CRITERIA, ...WHEEL_RUBRIC_CRITERIA] as const;

export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

/** Оценка одного рендера: 1..5 по каждому критерию (score любого — целое 1..5). */
export type RubricScore = Partial<Record<RubricCriterion, number>>;

/** Средний балл рендера принят, если >= этого. */
export const ACCEPT_MIN = 4;

/** Фича проходит go/no-go, если доля принятых рендеров >= этого. */
export const PASS_RATE = 0.7;

export function criteriaForOperations(operationKinds: string[]): RubricCriterion[] {
  const hasWheelOperation = operationKinds.some((kind) => kind === "wheel_replace" || kind === "wheel_recolor");
  return hasWheelOperation ? [...RUBRIC_CRITERIA] : [...COMMON_RUBRIC_CRITERIA];
}

export function scoreErrors(score: RubricScore, operationKinds: string[]): string[] {
  const errors: string[] = [];
  for (const criterion of criteriaForOperations(operationKinds)) {
    const value = score?.[criterion];
    if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) {
      errors.push(`${criterion} must be an integer from 1 to 5`);
    }
  }
  return errors;
}

export function meanScore(score: RubricScore, operationKinds: string[]): number {
  if (scoreErrors(score, operationKinds).length) return 0;
  const vals = criteriaForOperations(operationKinds).map((criterion) => score[criterion] as number);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function isAccepted(score: RubricScore, operationKinds: string[]): boolean {
  return meanScore(score, operationKinds) >= ACCEPT_MIN;
}
