// ============================================================================

import { planGeneration, CREDITS_PER_PASS } from './generation-planner.mjs';
import { createHash } from 'node:crypto';
import { buildPrompt, PROMPT_VERSION } from './prompt-builder.mjs';
import { createFalProvider } from './fal-provider.mjs';
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

// МОДЕЛЬ ЦЕН (решение Артура 23.09.2026): 1 кредит = 1 проход AI.
// Простые правки (плёнка, тонировка, цвет дисков) идут одним проходом = 1 кредит.
// Замена модели дисков по reference-фото идёт в том же проходе.
// ВАЖНО: цена считается ЗДЕСЬ, на сервере. Клиент присылает только ЧТО менять,
// а сколько это стоит — решает сервер (иначе можно было бы обмануть цену).
export const PRICING_VERSION = 3;
export { CREDITS_PER_PASS };

// Допустимые виды операций (раньше проверялись по ключам PRICE).
const OPERATION_KINDS = new Set(['wrap', 'tint', 'wheel_replace', 'wheel_recolor']);

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
    if (!OPERATION_KINDS.has(kind)) return { ok: false, error: `неизвестная операция: ${kind || ''}` };
    const group = kind.startsWith('wheel_') ? 'wheel' : kind;
    if (groups.has(group)) return { ok: false, error: `операция ${group} указана повторно` };
    groups.add(group);

    if (kind === 'wrap') {
      const optionId = cleanText(raw.optionId, 100);
      if (optionId) { normalized.push({ kind, optionId }); continue; }
      const color = cleanText(raw.color, 80);
      const finish = cleanText(raw.finish, 32);
      if (!color || !finish) return { ok: false, error: 'для плёнки нужны цвет и покрытие' };
      normalized.push({ kind, color, finish });
    } else if (kind === 'tint') {
      const levelId = cleanText(raw.levelId, 100);
      const zoneId = cleanText(raw.zoneId, 100);
      if (levelId && zoneId) { normalized.push({ kind, levelId, zoneId }); continue; }
      const name = cleanText(raw.name, 80);
      const level = cleanText(raw.level, 20);
      if (!name || !level) return { ok: false, error: 'для тонировки нужны название и уровень' };
      normalized.push({ kind, name, level });
    } else {
      const optionId = cleanText(raw.optionId, 100);
      const name = cleanText(raw.name, 120);
      const color = raw.color == null ? null : cleanText(raw.color, 32);
      const variantId = raw.variantId == null ? null : cleanText(raw.variantId, 100);
      const referenceImage = raw.referenceImage == null ? null : cleanText(raw.referenceImage, 500);
      const referenceAssetId = raw.referenceAssetId == null ? null : cleanText(raw.referenceAssetId, 100);
      if (kind === 'wheel_recolor' && optionId) { normalized.push({ kind, optionId }); continue; }
      if ((!name && !variantId) || (raw.color != null && !color)) return { ok: false, error: 'неверные параметры дисков' };
      if (referenceImage && !referenceImage.match(/^\/(?:wheel-catalog|wheel-uploads)\/[a-z0-9._-]+$/i)) {
        return { ok: false, error: 'неверная ссылка reference-изображения' };
      }
      normalized.push({ kind, ...(name ? { name } : {}), ...(color ? { color } : {}), ...(variantId ? { variantId } : {}), ...(referenceAssetId ? { referenceAssetId } : {}), ...(referenceImage ? { referenceImage } : {}) });
    }
  }
  return { ok: true, operations: normalized };
}

// Посчитать стоимость набора операций В КРЕДИТАХ = число проходов AI.
// Планировщик решает, что уходит в один проход, а что во второй (замена дисков),
// поэтому цена = сумма кредитов по шагам плана. Единый источник истины — planner.
export function costOf(operations) {
  for (const op of operations) {
    if (!OPERATION_KINDS.has(op.kind)) throw new Error('неизвестная операция: ' + op.kind);
  }
  return planGeneration(operations).reduce((sum, step) => sum + step.credits, 0);
}

// --- Провайдер-заглушка (mock). Имитирует AI: задержка, изредка "сбой". ---
async function mockGenerate({ sourceImage, operations, forceFail = false }) {
  await new Promise((r) => setTimeout(r, 150));      // как будто думает
  if (forceFail) return { ok: false, error: 'mock_forced_failure' };
  // "результат" = исходное фото (по-настоящему не меняем — это заглушка).
  return { ok: true, outputImage: sourceImage || '/uploads/mock-result.png', costUsd: 0 };
}

// Оркестратор: одна попытка + один ретрай (упрощённо; в slice0 есть и fallback).
async function runMockProvider(args) {
  let res = await mockGenerate(args);
  if (!res.ok) res = await mockGenerate(args);        // ретрай один раз
  return res;
}

function cacheKeyFor(asset, operations) {
  const normalized = operations.map((operation) => {
    if (operation.kind === 'wrap' || operation.kind === 'wheel_recolor') return `${operation.kind}:${operation.optionId || `${operation.color}:${operation.finish}`}`;
    if (operation.kind === 'tint') return `tint:${operation.levelId || operation.level}:${operation.zoneId || 'legacy'}`;
    return `wheel_replace:${operation.variantId || operation.referenceAssetId || operation.name}`;
  }).sort();
  return createHash('sha256').update(JSON.stringify({ source: asset.content_sha256 || asset.id || asset.url, normalized, promptVersion: PROMPT_VERSION })).digest('hex');
}

function usesCatalogIds(operation) {
  if (operation.kind === 'tint') return Boolean(operation.levelId && operation.zoneId);
  if (operation.kind === 'wheel_replace') return Boolean(operation.variantId || operation.referenceAssetId);
  return Boolean(operation.optionId);
}

function publicOperation(operation) {
  const { reference, promptFragment, ...safe } = operation;
  return safe;
}

// Защищает проект от двух одновременных нажатий Generate. React блокирует
// кнопку визуально, но два очень быстрых клика могут прийти на сервер раньше,
// чем браузер успеет перерисовать кнопку. Сервер обязан быть последней защитой.
const activeProjectGenerations = new Set();

// ============================================================================
// Главная функция: выполнить генерацию для проекта.
// Порядок (это важно для денег):
//   1) посчитать цену на сервере
//   2) СПИСАТЬ кредиты ДО вызова AI (нет кредитов -> вообще не зовём AI)
//   3) вызвать AI (заглушку)
//   4) успех -> сохранить версию;  провал -> ВЕРНУТЬ кредиты (не берём за брак)
// ============================================================================
async function generateForProjectUnlocked({
  db, userId, projectId, operations, forceFail = false, provider = null, ipHash = 'local', requestId = null,
}) {
  const validation = validateOperations(operations);
  if (!validation.ok) return { ok: false, code: 400, error: validation.error };
  const safeOperations = validation.operations;

  const project = db.getProject(projectId);
  if (!project || project.user_id !== userId)
    return { ok: false, code: 404, error: 'проект не найден' };

  const asset = db.getLatestSourceAsset(projectId);
  if (!asset?.url) return { ok: false, code: 409, error: 'сначала загрузи фотографию машины' };

  const mode = String(process.env.PROJECT_DRIVE_AI_MODE || 'mock').toLowerCase();
  if (!['mock', 'live'].includes(mode)) return { ok: false, code: 503, error: 'неверный режим AI' };
  if (mode === 'live' && safeOperations.some((operation) => !usesCatalogIds(operation))) {
    return { ok: false, code: 400, error: 'для живой генерации выберите опции из каталога' };
  }

  let resolvedOperations;
  try { resolvedOperations = db.resolveCatalogOperations(safeOperations, { projectId }); }
  catch (error) { return { ok: false, code: error.statusCode || 400, error: error.message }; }

  const cacheKey = cacheKeyFor(asset, resolvedOperations);
  const cached = db.getCachedVersion({ projectId, cacheKey });
  if (cached) return { ok: true, cached: true, versionId: cached.id, outputUrl: cached.output_url, creditsCharged: 0, plan: [] };

  const cost = costOf(resolvedOperations);

  // Отказ из-за пустого внутреннего кошелька не является попыткой AI: до fal
  // запрос не дойдёт. Поэтому сначала проверяем баланс, и только затем тратим
  // часовой лимит. Это исправляет блокировку после нескольких кликов при 0 cr.
  const wallet = db.getWallet(userId);
  if (!wallet || wallet.balance < cost) return { ok: false, code: 402, error: 'недостаточно кредитов', needed: cost };

  if (mode === 'live') {
    const limit = Math.max(1, Number(process.env.PROJECT_DRIVE_GENERATIONS_PER_HOUR || 6));
    if (!db.consumeGenerationAttempt({ userId, ipHash, limit })) return { ok: false, code: 429, error: 'лимит генераций исчерпан; попробуйте через час' };
  }

  // Списание и pending-job создаются одной транзакцией. Если процесс оборвётся
  // до ответа провайдера, следующий запуск сервера вернёт зарезервированные кредиты.
  const reservation = db.beginGenerationJob({ userId, projectId, credits: cost });
  if (!reservation.ok) return { ok: false, code: 402, error: 'недостаточно кредитов', needed: cost };
  const generationJobId = reservation.jobId;
  const finishJob = (status, error = null, versionId = null) => {
    db.finishGenerationJob({ jobId: generationJobId, status, error, versionId });
  };

  let refunded = 0;
  function refund(amount, reason) {
    const safeAmount = Math.min(Math.max(0, amount), cost - refunded);
    if (!safeAmount) return;
    db.addCredits({ userId, amount: safeAmount, reason });
    refunded += safeAmount;
  }

  const plan = planGeneration(resolvedOperations);
  const selectedProvider = provider || (mode === 'live' ? createFalProvider({ db }) : runMockProvider);
  let currentImage = asset.url;
  let completedCredits = 0;
  let internalCostUsd = 0;
  const completedOperations = [];

  for (let index = 0; index < plan.length; index += 1) {
    const step = plan[index];
    let result;
    try {
      const prompt = buildPrompt(step.operations);
      const wheel = step.operations.find((operation) => operation.kind === 'wheel_replace');
      const startedAt = Date.now();
      result = await selectedProvider({
        sourceImage: currentImage, operations: step.operations, forceFail, step, prompt,
        referenceImage: wheel?.referenceImage || null, reference: wheel?.reference || null, requestId,
      });
      if (mode === 'live') db.recordAiJob({
        userId, projectId, provider: result.provider || 'fal', latencyMs: Date.now() - startedAt,
        costUsd: result.costUsd || 0, error: result.ok ? null : result.error, creditsCharged: result.ok ? step.credits : 0,
      });
    } catch {
      result = { ok: false, error: 'provider_error' };
    }
    internalCostUsd += Number(result.costUsd || 0);
    if (!result.ok) {
      refund(cost - completedCredits, result.error === 'provider_error' ? 'refund:provider_error' : 'refund:generate_failed');
      if (!completedOperations.length) {
        const message = result.error === 'result_unchanged'
          ? 'не удалось применить изменение, попробуйте другой вариант; кредиты возвращены'
          : result.error === 'lifetime_budget_exceeded' || result.error === 'daily_budget_exceeded'
            ? 'лимит расходов AI достигнут; кредиты возвращены'
            : 'генерация не удалась, кредиты возвращены';
        finishJob('failed', result.error || 'provider_error');
        return { ok: false, code: result.error?.includes('budget_exceeded') ? 503 : 502, error: message, refundedCredits: refunded };
      }
      try {
        const versionId = db.createVersion({
          projectId, config: completedOperations.map(publicOperation), outputUrl: currentImage, creditsCharged: completedCredits,
          status: 'partial', warning: 'Часть изменений не выполнена; кредиты за неё возвращены.', plannedCredits: cost,
          promptVersion: PROMPT_VERSION, pricingVersion: PRICING_VERSION, internalCostUsd,
        });
        finishJob('done', null, versionId);
        return {
          ok: true, partial: true, versionId, outputUrl: currentImage,
          creditsCharged: completedCredits, refundedCredits: refunded,
          failedStep: step.id, warning: 'часть изменений не выполнена; кредиты за неё возвращены',
        };
      } catch {
        refund(completedCredits, 'refund:save_failed');
        finishJob('failed', 'save_failed');
        return { ok: false, code: 500, error: 'частичный результат не удалось сохранить, все кредиты возвращены', refundedCredits: refunded };
      }
    }
    currentImage = result.outputImage;
    completedOperations.push(...step.operations);
    completedCredits += step.credits;
  }

  // Все шаги успешны: сохраняем один неизменный снимок итоговой конфигурации.
  let versionId;
  try {
    versionId = db.createVersion({
      projectId, config: resolvedOperations.map(publicOperation), outputUrl: currentImage, creditsCharged: cost,
      status: 'complete', plannedCredits: cost, cacheKey, promptVersion: PROMPT_VERSION, pricingVersion: PRICING_VERSION, internalCostUsd,
    });
  } catch {
    refund(cost, 'refund:save_failed');
    finishJob('failed', 'save_failed');
    return { ok: false, code: 500, error: 'результат не удалось сохранить, кредиты возвращены' };
  }
  finishJob('done', null, versionId);
  return { ok: true, versionId, creditsCharged: cost, outputUrl: currentImage, internalCostUsd, plan: plan.map((step) => step.id) };
}

export async function generateForProject(args) {
  const projectId = String(args?.projectId || '');
  if (activeProjectGenerations.has(projectId)) {
    return { ok: false, code: 409, error: 'для этого проекта уже выполняется генерация; дождитесь результата' };
  }
  activeProjectGenerations.add(projectId);
  try {
    return await generateForProjectUnlocked(args);
  } finally {
    activeProjectGenerations.delete(projectId);
  }
}
