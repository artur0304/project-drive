// ============================================================================
// Рубрика качества и пороги для bake-off (ТЗ раздел 3).
// Оценка РУЧНАЯ: человек смотрит рендер и ставит 1..5 по каждому критерию.
// Acceptance = средний балл >= ACCEPT_MIN. Go/no-go по фиче = доля принятых >= PASS_RATE.
// Пороги стартовые — подвинем по реальным данным.
// ============================================================================

export const RUBRIC_CRITERIA = [
  "car_identity_preserved",
  "geometry_preserved",
  "background_preserved",
  "lighting_believable",
  "target_modification_accurate",
  "wheel_perspective",
  "wheel_design_fidelity",
  "no_unwanted_changes",
] as const;

export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

/** Оценка одного рендера: 1..5 по каждому критерию (score любого — целое 1..5). */
export type RubricScore = Partial<Record<RubricCriterion, number>>;

/** Средний балл рендера принят, если >= этого. */
export const ACCEPT_MIN = 4;

/** Фича проходит go/no-go, если доля принятых рендеров >= этого. */
export const PASS_RATE = 0.7;

export function meanScore(score: RubricScore): number {
  const vals = RUBRIC_CRITERIA.map((c) => score[c]).filter(
    (v): v is number => typeof v === "number"
  );
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function isAccepted(score: RubricScore): boolean {
  return meanScore(score) >= ACCEPT_MIN;
}
