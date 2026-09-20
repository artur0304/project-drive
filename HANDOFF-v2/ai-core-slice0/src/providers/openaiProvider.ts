// ============================================================================
// Шаблон РЕАЛЬНОГО адаптера (на примере OpenAI-совместимого image-edit API).
// Это заготовка структуры. Точный endpoint/имена полей/формат ответа надо
// подтвердить по актуальной доке провайдера перед запуском bake-off —
// они меняются, и я не выдумываю их наугад.
//
// Принципы (из ТЗ):
//  - ключ ТОЛЬКО из env, никогда не в коде;
//  - возвращаем внутреннюю стоимость вызова (для cost-per-render);
//  - любые ошибки сети/лимитов -> ok:false + error, оркестратор сам решит retry/fallback.
// ============================================================================

import type { AICarEditProvider } from "./provider";
import type { OperationConfig, ProviderResult } from "../types";

export interface OpenAIProviderOptions {
  apiKey: string; // передаётся из process.env, не хардкодить
  model: string; // имя image-edit модели — подтвердить по доке
  endpoint?: string; // напр. "https://api.openai.com/v1/images/edits" — ПОДТВЕРДИТЬ
  /** Оценка стоимости одного вызова, USD — для лога. Уточнить по прайсингу. */
  estimatedCostUsd?: number;
}

export class OpenAICarEditProvider implements AICarEditProvider {
  readonly name = "openai";
  readonly billingMode = "paid" as const;
  readonly maxCostUsdPerCall: number;
  private opts: OpenAIProviderOptions;

  constructor(opts: OpenAIProviderOptions) {
    if (!opts.apiKey) throw new Error("OpenAICarEditProvider: apiKey is required (use env)");
    this.opts = opts;
    this.maxCostUsdPerCall = opts.estimatedCostUsd ?? 0.05;
  }

  async generateCarEdit(
    sourceImage: string,
    instruction: string,
    referenceImages: string[],
    _operations: OperationConfig[]
  ): Promise<ProviderResult> {
    const endpoint = this.opts.endpoint ?? "https://api.openai.com/v1/images/edits";
    const cost = this.opts.estimatedCostUsd ?? 0.05;

    try {
      // TODO(confirm): точный формат тела запроса зависит от выбранной модели.
      // Ниже — каркас. Подставить реальные поля (image как файл/base64,
      // reference images, instruction) по актуальной доке.
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.opts.model,
          prompt: instruction,
          image: sourceImage,
          reference_images: referenceImages, // TODO(confirm): поддерживается ли и как называется
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, internalCostUsd: cost, error: `http_${res.status}:${text.slice(0, 200)}` };
      }

      const data: any = await res.json();
      // TODO(confirm): путь к картинке в ответе.
      const outputImage: string | undefined =
        data?.data?.[0]?.url ?? data?.data?.[0]?.b64_json ?? undefined;

      if (!outputImage) {
        return { ok: false, internalCostUsd: cost, error: "no_image_in_response" };
      }
      return { ok: true, outputImage, internalCostUsd: cost };
    } catch (e: any) {
      return { ok: false, internalCostUsd: cost, error: `exception:${e?.message ?? "unknown"}` };
    }
  }
}
