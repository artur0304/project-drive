// ============================================================================
// Интерфейс AI-провайдера. Любой провайдер (Mock, OpenAI, FLUX, ...) реализует
// ЭТОТ контракт. Это и есть AI Provider Layer из ТЗ (раздел 3):
// никакого provider-specific кода за пределами адаптеров.
// ============================================================================

import type { OperationConfig, ProviderResult } from "../types";

/** Единый вход в модель: один вызов = одно инструктивное редактирование. */
export interface AICarEditProvider {
  /** Уникальное имя провайдера для логов/роутинга, напр. "mock", "openai", "flux". */
  readonly name: string;
  /** mock не ходит во внешнюю сеть; paid потенциально создаёт реальный расход. */
  readonly billingMode: "mock" | "paid";
  /** Консервативный предел одного вызова для проверки бюджета ДО запроса. */
  readonly maxCostUsdPerCall: number;

  /**
   * Единый метод из ТЗ: generateCarEdit(image, operation/config, params, references).
   * @param sourceImage  исходное фото (url/base64).
   * @param instruction  готовая текст-инструкция (собрана в instructions.ts).
   * @param referenceImages  reference-картинки (напр. точный диск). Может быть пусто.
   */
  generateCarEdit(
    sourceImage: string,
    instruction: string,
    referenceImages: string[],
    operations: OperationConfig[]
  ): Promise<ProviderResult>;
}
