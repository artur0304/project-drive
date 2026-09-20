// Денежный предохранитель для bake-off. Он работает ДО вызова провайдера:
// платный адаптер нельзя запустить случайно, а новая попытка не начинается,
// если её заявленная максимальная стоимость уже не помещается в лимит.

import type { AICarEditProvider } from "./providers/provider";

export type SpendBlockReason = "paid_provider_blocked" | "budget_exhausted";

export interface SpendGuardOptions {
  maxBudgetUsd: number;
  allowPaidProviders?: boolean;
}

export class SpendGuard {
  private spentUsd = 0;
  readonly maxBudgetUsd: number;
  readonly allowPaidProviders: boolean;

  constructor(options: SpendGuardOptions) {
    if (!Number.isFinite(options.maxBudgetUsd) || options.maxBudgetUsd <= 0) {
      throw new Error("maxBudgetUsd must be a positive number");
    }
    this.maxBudgetUsd = options.maxBudgetUsd;
    this.allowPaidProviders = options.allowPaidProviders === true;
  }

  canStart(provider: AICarEditProvider): { allowed: true } | { allowed: false; reason: SpendBlockReason } {
    if (provider.billingMode === "paid" && !this.allowPaidProviders) {
      return { allowed: false, reason: "paid_provider_blocked" };
    }
    if (this.spentUsd + provider.maxCostUsdPerCall > this.maxBudgetUsd + Number.EPSILON) {
      return { allowed: false, reason: "budget_exhausted" };
    }
    return { allowed: true };
  }

  record(actualCostUsd: number): void {
    if (!Number.isFinite(actualCostUsd) || actualCostUsd < 0) {
      throw new Error("Provider returned an invalid internalCostUsd");
    }
    this.spentUsd = round6(this.spentUsd + actualCostUsd);
  }

  snapshot() {
    return {
      maxBudgetUsd: this.maxBudgetUsd,
      spentUsd: this.spentUsd,
      remainingUsd: round6(Math.max(0, this.maxBudgetUsd - this.spentUsd)),
      allowPaidProviders: this.allowPaidProviders,
    };
  }
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
