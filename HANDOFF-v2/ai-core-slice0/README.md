# Slice 0 — AI core (Project Drive)

Фреймворк-независимое ядро первой фазы: **AI Provider Layer + Orchestrator + Bake-off**.
Это НЕ весь Slice 0 — это его сердце (то, что доказывает петлю и цену). Editor-UI на Next.js
подключается сверху позже и вызывает `GenerationOrchestrator.run()`.

## Что здесь есть
- `src/types.ts` — операции, конфиги, request/result, логи.
- `src/instructions.ts` — structured draft → текст-инструкция + reference images (preservation-first).
- `src/providers/provider.ts` — контракт `AICarEditProvider` (единый `generateCarEdit`).
- `src/providers/mockProvider.ts` — `MockAIProvider` (тест логики без сети/денег).
- `src/providers/openaiProvider.ts` — шаблон реального адаптера (endpoint/поля — ПОДТВЕРДИТЬ по доке).
- `src/providers/index.ts` — реестр + роутинг провайдера по операции + fallback.
- `src/orchestrator.ts` — primary → retry(1) → fallback(1), логи, cost/latency.
- `src/budget.ts` — блокировка paid-провайдеров по умолчанию и общий USD-лимит
  до начала каждой новой попытки.
- `src/bakeoff/rubric.ts` — 8 критериев качества + пороги (accept ≥4/5, go/no-go ≥70%).
- `src/bakeoff/runBakeoff.ts` — честная матрица: каждый кейс независимо проходит
  через каждого кандидата → JSON/CSV + scoring-шаблон. Fallback одного кандидата
  не подменяет результат другого кандидата.

## Запуск демо (без сети, на mock-провайдерах)
```bash
npm install
npm run bakeoff:demo
```
Появится папка `out/` с результатами и сохранёнными изображениями. Для честной
ручной оценки `bakeoff_scoring_template.json` скрывает кандидата и провайдера;
соответствие раскрывается после оценки через отдельный `bakeoff_blind_key.json`.
`bakeoff_run_manifest.json` фиксирует режим запуска, лимит и фактический расход.

Demo всегда передаёт `allowPaidProviders: false`. Даже если платный адаптер случайно
попадёт в registry, он не будет вызван. Разрешённый в будущем платный прогон требует
одновременно `allowPaidProviders: true`, положительный `maxBudgetUsd` и одноразовую
переменную `PROJECT_DRIVE_ALLOW_PAID_AI=YES_FOR_THIS_RUN`. Этот механизм не заменяет
лимит в кабинете провайдера: `maxCostUsdPerCall` должен быть выставлен консервативно.

## Настоящий bake-off
1. Реализуй/подтверди реальные адаптеры (openaiProvider и ещё 1–2), ключи — из env.
2. Подготовь 15–20 реальных фото машин и составь `BakeoffCase[]` (каждая из 4 операций).
3. Запусти harness → получишь latency/cost/attempts/success и картинки.
4. Руками оцени качество в `bakeoff_scoring_template.json` (1..5 по критериям).
5. Вызови `summarizeQuality()` → увидишь acceptance rate и PASS/NO-GO по каждой операции.

## Пороги (стартовые, подвинем по данным)
- Рендер принят, если средний балл ≥ 4/5.
- Операция проходит, если принято ≥ 70% рендеров.
- Главная денежная метрика — **cost per successful render** (с ретраями), не цена за вызов.

## Границы Slice 0
Здесь НЕТ: auth, credits, payments, каталога, админки, БД. Всё это — Slice 1+.
