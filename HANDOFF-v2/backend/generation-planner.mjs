// Planner минимизирует число AI-вызовов, но отделяет точную замену дисков:
// плёнку/тонировку/перекраску выгодно делать одним запросом, а reference-диск
// последним шагом, чтобы его геометрия не размылась последующей операцией.
export function planGeneration(operations, prices) {
  const wheelReplace = operations.find((operation) => operation.kind === 'wheel_replace');
  const appearance = operations.filter((operation) => operation !== wheelReplace);
  const groups = wheelReplace && appearance.length ? [appearance, [wheelReplace]] : [operations];
  return groups.map((stepOperations, index) => ({
    id: groups.length === 1 ? 'combined' : index === 0 ? 'appearance' : 'wheel_precision',
    operations: stepOperations,
    credits: stepOperations.reduce((sum, operation) => sum + prices[operation.kind], 0),
  }));
}
