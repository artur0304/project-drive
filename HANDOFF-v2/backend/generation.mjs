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

function cleanText(value, maxLength) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return text && text.length <= maxLength ? text : null;
}

// Проверяем и одновременно очищаем данные клиента. В один Generate допустимы
// максимум плёнка, тонировка и одна операция с дисками.
export function validateOperations(operations) {
  if (!Array.isArray(operations) || operations.length === 0)
    return { ok: false, error: 'нечего генерировать' };
  if (operations.length > 3)
    return { ok: false, error: 'слишком много операций' };

  const groups = new Set();
  const normalized = [];
  for (const raw of operations) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      return { ok: false, error: 'операция имеет неверный формат' };

    const kind = raw.kind;
    if (!Object.hasOwn(PRICE, kind)) return { ok: false, error: `неизвестная операция: ${kind || ''}` };
    const group = kind.startsWith('wheel_') ? 'wheel' : kind;
    if (groups.has(group)) return { ok: false, error: `операция ${group} указана повторно` };
    groups.add(group);

    if (kind === 'wrap') {
      const color = cleanText(raw.color, 80);
      const finish = cleanText(raw.finish, 32);
      if (!color || !finish) return { ok: false, error: 'для плёнки нужны цвет и покрытие' };
      normalized.push({ kind, color, finish });
    } else if (kind === 'tint') {
      const name = cleanText(raw.name, 80);
      const level = cleanText(raw.level, 20);
      if (!name || !level) return { ok: false, error: 'для тонировки нужны название и уровень' };
      normalized.push({ kind, name, level });
    } else {
      const name = cleanText(raw.name, 120);
      const color = raw.color == null ? null : cleanText(raw.color, 32);
      const variantId = raw.variantId == null ? null : cleanText(raw.variantId, 100);
      const referenceImage = raw.referenceImage == null ? null : cleanText(raw.referenceImage, 500);
      if (!name || (raw.color != null && !color)) return { ok: false, error: 'неверные параметры дисков' };
      if (referenceImage && !referenceImage.match(/^\/(?:wheel-catalog|wheel-uploads)\/[a-z0-9._-]+$/i)) {
        return { ok: false, error: 'неверная ссылка reference-изображения' };
      }
      normalized.push({ kind, name, ...(color ? { color } : {}), ...(variantId ? { variantId } : {}), ...(referenceImage ? { referenceImage } : {}) });
    }
  }
  return { ok: true, operations: normalized };
}

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
export async function generateForProject({
  db, userId, projectId, operations, forceFail = false, provider = runProvider,
}) {
  const validation = validateOperations(operations);
  if (!validation.ok) return { ok: false, code: 400, error: validation.error };
  const safeOperations = validation.operations;

  const project = db.getProject(projectId);
  if (!project || project.user_id !== userId)
    return { ok: false, code: 404, error: 'проект не найден' };

  const asset = db.getLatestSourceAsset(projectId);
  if (!asset?.url) return { ok: false, code: 409, error: 'сначала загрузи фотографию машины' };

  const cost = costOf(safeOperations);

  // 2) списываем кредиты заранее. spendCredits вернёт false, если не хватает.
  const paid = db.spendCredits({ userId, amount: cost, reason: 'generate' });
  if (!paid) return { ok: false, code: 402, error: 'недостаточно кредитов', needed: cost };

  let refunded = false;
  function refund(reason) {
    if (refunded) return;
    db.addCredits({ userId, amount: cost, reason });
    refunded = true;
  }

  // 3) берём исходное фото проекта (последнее загруженное) и зовём AI-заглушку
  let result;
  try {
    result = await provider({ sourceImage: asset.url, operations: safeOperations, forceFail });
  } catch {
    refund('refund:provider_error');
    return { ok: false, code: 502, error: 'провайдер недоступен, кредиты возвращены' };
  }

  // 4a) провал -> возвращаем кредиты обратно, версию не создаём
  if (!result.ok) {
    refund('refund:generate_failed');
    return { ok: false, code: 502, error: 'генерация не удалась, кредиты возвращены' };
  }

  // 4b) успех -> сохраняем версию (неизменный снимок настроек + результат)
  let versionId;
  try {
    versionId = db.createVersion({
      projectId, config: safeOperations, outputUrl: result.outputImage, creditsCharged: cost,
    });
  } catch {
    refund('refund:save_failed');
    return { ok: false, code: 500, error: 'результат не удалось сохранить, кредиты возвращены' };
  }
  return { ok: true, versionId, creditsCharged: cost, outputUrl: result.outputImage };
}
