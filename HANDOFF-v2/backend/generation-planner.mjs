// Один запрос Nano Banana принимает исходное фото и reference диска вместе.
// Поэтому все выбранные изменения собираются в один проход: пользователь платит
// за готовый вариант, а не отдельно за плёнку, тонировку и диски.
//
// МОДЕЛЬ ЦЕН (решение Артура 23.09.2026): клиент платит за КАЖДЫЙ проход AI,
// а не за каждое изменение. Себестоимость зависит от числа проходов, а не от
// количества правок в одном проходе, поэтому 1 проход = 1 кредит.
export const CREDITS_PER_PASS = 1;

export function planGeneration(operations, creditsPerPass = CREDITS_PER_PASS) {
  if (!Array.isArray(operations) || !operations.length) return [];
  return [{ id: 'combined', operations, credits: creditsPerPass }];
}
