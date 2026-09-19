// ============================================================================
// generation.mjs — "мозг" генерации на стороне сервера.
// ----------------------------------------------------------------------------
// Здесь считается ЦЕНА (на сервере, не доверяя клиенту), вызывается AI и
// сохраняется результат. Сейчас AI — ЗАГЛУШКА (mock): она не рисует по-настоящему,
// а просто возвращает исходное фото как "результат", чтобы проверить всю цепочку
// без реального AI и без денег.
//
// ДЛЯ CODEX: настоящий AI уже написан отдельно в папке slice0 (TypeScript:
// AI Provider Layer + orchestrator + адаптер Gemini/Nano Banana). В проде замени
// mockGenerate() на вызов этого слоя — интерфейс (что на входе/выходе) тот же.
// ============================================================================

// Цены операций в кредитах. УСЛОВНЫЕ — реальные поставим после теста генерации.
// ВАЖНО: цена считается ЗДЕСЬ, на сервере. Клиент присылает только ЧТО менять,
// а сколько это стоит — решает сервер (иначе можно было бы обмануть цену).
export const PRICE = { wrap: 25, tint: 10, wheel_replace: 20, wheel_recolor: 10 };

// Посчитать стоимость набора операций.
export function costOf(operations) {
  let total = 0;
  for (const op of operations) {
    const p = PRICE[op.kind];
    if (p == null) throw new Error('неизвестная операция: ' + op.kind);
    total += p;
  }
  return total;
}

// --- Провайдер-заглушка (mock). Имитирует AI: задержка, изредка "сбой". ---
async function mockGenerate({ sourceImage, operations, forceFail = false }) {
  await new Promise((r) => setTimeout(r, 150));      // как будто думает
  if (forceFail) return { ok: false, error: 'mock_forced_failure' };
  // "результат" = исходное фото (по-настоящему не меняем — это заглушка).
  return { ok: true, outputImage: sourceImage || '/uploads/mock-result.png', costUsd: 0 };
}

// Оркестратор: одна попытка + один ретрай (упрощённо; в slice0 есть и fallback).
async function runProvider(args) {
  let res = await mockGenerate(args);
  if (!res.ok) res = await mockGenerate(args);        // ретрай один раз
  return res;
}

// ============================================================================
// Главная функция: выполнить генерацию для проекта.
// Порядок (это важно для денег):
//   1) посчитать цену на сервере
//   2) СПИСАТЬ кредиты ДО вызова AI (нет кредитов -> вообще не зовём AI)
//   3) вызвать AI (заглушку)
//   4) успех -> сохранить версию;  провал -> ВЕРНУТЬ кредиты (не берём за брак)
// ============================================================================
export async function generateForProject({ db, userId, projectId, operations, forceFail = false }) {
  if (!Array.isArray(operations) || operations.length === 0)
    return { ok: false, code: 400, error: 'нечего генерировать' };

  const project = db.getProject(projectId);
  if (!project || project.user_id !== userId)
    return { ok: false, code: 404, error: 'проект не найден' };

  const cost = costOf(operations);

  // 2) списываем кредиты заранее. spendCredits вернёт false, если не хватает.
  const paid = db.spendCredits({ userId, amount: cost, reason: 'generate' });
  if (!paid) return { ok: false, code: 402, error: 'недостаточно кредитов', needed: cost };

  // 3) берём исходное фото проекта (последнее загруженное) и зовём AI-заглушку
  const asset = db.getLatestSourceAsset(projectId);
  const result = await runProvider({ sourceImage: asset?.url, operations, forceFail });

  // 4a) провал -> возвращаем кредиты обратно, версию не создаём
  if (!result.ok) {
    db.addCredits({ userId, amount: cost, reason: 'refund:generate_failed' });
    return { ok: false, code: 502, error: 'генерация не удалась, кредиты возвращены' };
  }

  // 4b) успех -> сохраняем версию (неизменный снимок настроек + результат)
  const versionId = db.createVersion({
    projectId, config: operations, outputUrl: result.outputImage, creditsCharged: cost,
  });
  return { ok: true, versionId, creditsCharged: cost, outputUrl: result.outputImage };
}
