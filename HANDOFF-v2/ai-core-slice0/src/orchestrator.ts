// ============================================================================
// Оркестратор — сердце AI-ядра.
// Из ТЗ (раздел 9): primary -> retry того же 1 раз -> fallback на другого 1 раз.
// Логируем каждую попытку, суммарную стоимость и задержку.
// Платим (в смысле credits) только за годный результат — это решает вызывающий код,
// здесь мы лишь честно отдаём ok + полный лог расходов (включая расходы при ok=false).
// ============================================================================

import type {
  GenerationRequest,
  GenerationResult,
  AttemptLog,
} from "./types";
import { buildInstruction } from "./instructions";
import { ProviderRegistry } from "./providers";

export interface OrchestratorOptions {
  /** Сколько раз ретраить того же провайдера перед фоллбэком. По ТЗ = 1. */
  retriesSameProvider?: number;
}

export class GenerationOrchestrator {
  constructor(
    private registry: ProviderRegistry,
    private opts: OrchestratorOptions = {}
  ) {}

  async run(req: GenerationRequest): Promise<GenerationResult> {
    const attempts: AttemptLog[] = [];
    const startedAt = Date.now();

    if (!req.operations || req.operations.length === 0) {
      return {
        ok: false,
        attempts,
        totalInternalCostUsd: 0,
        totalLatencyMs: 0,
        failureReason: "invalid_request",
      };
    }

    const built = buildInstruction(req.operations);
    const rule = this.registry.ruleFor(built.operationKinds);
    const retries = this.opts.retriesSameProvider ?? 1;

    // Порядок попыток: primary + N ретраев primary, затем fallback (1 раз).
    const plan: { providerName: string; attemptType: AttemptLog["attemptType"] }[] = [
      { providerName: rule.primary, attemptType: "primary" },
    ];
    for (let i = 0; i < retries; i++) {
      plan.push({ providerName: rule.primary, attemptType: "retry" });
    }
    if (rule.fallback) {
      plan.push({ providerName: rule.fallback, attemptType: "fallback" });
    }

    let totalCost = 0;

    for (const step of plan) {
      const provider = this.registry.get(step.providerName);
      const t0 = Date.now();
      const result = await provider.generateCarEdit(
        req.sourceImage,
        built.text,
        built.referenceImages,
        req.operations
      );
      const latencyMs = Date.now() - t0;
      totalCost += result.internalCostUsd;

      attempts.push({
        provider: provider.name,
        operationKinds: built.operationKinds,
        ok: result.ok,
        latencyMs,
        internalCostUsd: result.internalCostUsd,
        error: result.error,
        attemptType: step.attemptType,
      });

      if (result.ok) {
        return {
          ok: true,
          outputImage: result.outputImage,
          providerUsed: provider.name,
          attempts,
          totalInternalCostUsd: round4(totalCost),
          totalLatencyMs: Date.now() - startedAt,
        };
      }
    }

    // Все попытки провалились.
    return {
      ok: false,
      attempts,
      totalInternalCostUsd: round4(totalCost),
      totalLatencyMs: Date.now() - startedAt,
      failureReason: "all_providers_failed",
    };
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
