// ============================================================================
// MockAIProvider — фейковый провайдер для тестов и CI.
// НЕ ходит в сеть, НЕ тратит деньги. Нужен, чтобы проверить логику
// оркестратора (retry/fallback/логи) и bake-off без реальных AI-вызовов.
// Умеет симулировать задержку, стоимость и управляемый процент сбоев.
// ============================================================================

import type { AICarEditProvider } from "./provider";
import type { OperationConfig, ProviderResult } from "../types";

export interface MockProviderOptions {
  name?: string;
  /** Доля сбоев 0..1 (для проверки retry/fallback). */
  failureRate?: number;
  /** Диапазон симулируемой задержки, мс. */
  latencyMsRange?: [number, number];
  /** Симулируемая стоимость одного вызова, USD. */
  costUsd?: number;
}

export class MockAIProvider implements AICarEditProvider {
  readonly name: string;
  private failureRate: number;
  private latencyMsRange: [number, number];
  private costUsd: number;

  constructor(opts: MockProviderOptions = {}) {
    this.name = opts.name ?? "mock";
    this.failureRate = opts.failureRate ?? 0;
    this.latencyMsRange = opts.latencyMsRange ?? [200, 600];
    this.costUsd = opts.costUsd ?? 0.03;
  }

  async generateCarEdit(
    sourceImage: string,
    _instruction: string,
    _referenceImages: string[],
    _operations: OperationConfig[]
  ): Promise<ProviderResult> {
    const [lo, hi] = this.latencyMsRange;
    const delay = Math.round(lo + Math.random() * (hi - lo));
    await new Promise((r) => setTimeout(r, delay));

    const failed = Math.random() < this.failureRate;
    if (failed) {
      return {
        ok: false,
        internalCostUsd: this.costUsd, // сбой тоже стоит денег — это важно логировать
        error: "mock_simulated_failure",
      };
    }

    // Мок «возвращает» исходное изображение как результат — визуально ничего не меняет,
    // но позволяет протестировать весь путь данных end-to-end.
    return {
      ok: true,
      outputImage: sourceImage,
      internalCostUsd: this.costUsd,
    };
  }
}
