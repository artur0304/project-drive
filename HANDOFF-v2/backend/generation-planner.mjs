// Planner минимизирует число AI-вызовов, но отделяет точную замену дисков:
// плёнку/тонировку/перекраску выгодно делать одним запросом, а reference-диск
// последним шагом, чтобы его геометрия не размылась последующей операцией.
//
// МОДЕЛЬ ЦЕН (решение Артура 23.09.2026): клиент платит за КАЖДЫЙ проход AI,
// а не за каждое изменение. Себестоимость зависит от числа проходов, а не от
// количества правок в одном проходе, поэтому 1 проход = 1 кредит.
export const CREDITS_PER_PASS = 1;

export function planGeneration(operations, creditsPerPass = CREDITS_PER_PASS) {
  const wheelReplace = operations.find((operation) => operation.kind === 'wheel_replace');
  const appearance = operations.filter((operation) => operation !== wheelReplace);
  const groups = wheelReplace && appearance.length ? [appearance, [wheelReplace]] : [operations];
  return groups.map((stepOperations, index) => ({
    id: groups.length === 1 ? 'combined' : index === 0 ? 'appearance' : 'wheel_precision',
    operations: stepOperations,
    // Каждый проход стоит фиксированно 1 кредит (раньше суммировались цены операций).
    credits: creditsPerPass,
  }));
}
