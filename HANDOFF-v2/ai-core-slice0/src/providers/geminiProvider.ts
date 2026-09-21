// ============================================================================
// src/providers/geminiProvider.ts
// ----------------------------------------------------------------------------
// РЕАЛЬНЫЙ адаптер под Google Gemini image ("Nano Banana").
// Реализует тот же контракт AICarEditProvider, что и MockAIProvider,
// поэтому оркестратору всё равно, кто перед ним — mock или Gemini.
//
// Что он делает: берёт фото машины + текст-инструкцию (+ reference-картинки диска),
// шлёт их в Gemini и возвращает отредактированное фото.
//
// Проверено по актуальной доке 21.09.2026:
//  - Endpoint:  POST https://generativelanguage.googleapis.com/v1beta/interactions
//  - Авторизация: заголовок  x-goog-api-key: <твой ключ>   (НЕ Bearer для этого endpoint)
//  - Картинка на вход: { type:"image", mime_type, data(base64) }
//  - Ответ: steps[].content[] — ищем type:"image" с data(base64)
//
// Стабильные модели "Nano Banana" на дату проверки:
//   gemini-3-pro-image             — студийное качество (лучшее сохранение) ← дефолт
//   gemini-3.1-flash-image         — баланс цена/качество
//   gemini-3.1-flash-lite-image    — самый дешёвый/быстрый
//   gemini-2.5-flash-image         — прошлое поколение (ещё работает)
// Для bake-off удобно сравнить pro (качество) против flash (цена).
// ============================================================================

import * as fs from "fs";
import type { AICarEditProvider } from "./provider";
import type { OperationConfig, ProviderResult } from "../types";

export interface GeminiProviderOptions {
  /** Уникальная подпись модели в bake-off, например gemini-pro или gemini-flash. */
  name?: string;
  /** API-ключ. ТОЛЬКО из process.env.GEMINI_API_KEY — никогда не в коде. */
  apiKey: string;
  /** Имя модели. По умолчанию — Nano Banana Pro (лучшее сохранение). */
  model?: string;
  /** Базовый URL. По умолчанию официальный. Можно подменить на прокси. */
  baseUrl?: string;
  /**
   * Оценка стоимости одного вызова в USD — ТОЛЬКО для лога/сравнения.
   * Точную цифру подставишь после первых реальных генераций (по billing).
   * Не влияет на списание у Google — это наша внутренняя оценка.
   */
  estimatedCostUsd?: number;
  /** Необязательный aspectRatio. Для тюнинга машины лучше НЕ задавать —
   *  пусть модель держит исходную композицию фото. Оставлено на будущее. */
  aspectRatio?: string;
}

export class GeminiCarEditProvider implements AICarEditProvider {
  readonly name: string;
  readonly billingMode = "paid" as const;
  readonly maxCostUsdPerCall: number;
  private opts: Required<Omit<GeminiProviderOptions, "aspectRatio" | "name">> & {
    aspectRatio?: string;
  };

  constructor(opts: GeminiProviderOptions) {
    if (!opts.apiKey) {
      throw new Error("GeminiCarEditProvider: apiKey required (use process.env.GEMINI_API_KEY)");
    }
    // Заполняем значения по умолчанию.
    const model = opts.model ?? "gemini-3-pro-image";
    this.name = opts.name ?? `gemini:${model}`;
    this.opts = {
      apiKey: opts.apiKey,
      model,
      baseUrl: opts.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta",
      estimatedCostUsd: opts.estimatedCostUsd ?? 0.05, // placeholder, уточнить по billing
      aspectRatio: opts.aspectRatio,
    };
    this.maxCostUsdPerCall = this.opts.estimatedCostUsd;
  }

  async generateCarEdit(
    sourceImage: string,
    instruction: string,
    referenceImages: string[],
    _operations: OperationConfig[]
  ): Promise<ProviderResult> {
    const cost = this.opts.estimatedCostUsd;

    try {
      // 1) Превращаем исходное фото и reference-картинки в base64 + MIME.
      //    toInlineData умеет читать: data-URL, http(s)-ссылку и локальный файл.
      const sourcePart = await toInlineData(sourceImage);
      const refParts = await Promise.all(referenceImages.map((r) => toInlineData(r)));

      // 2) Собираем input: сначала текст-инструкция, затем фото машины, затем диски.
      //    Порядок важен для читаемости, модель видит все картинки как контекст.
      const input: any[] = [
        { type: "text", text: instruction },
        { type: "image", mime_type: sourcePart.mimeType, data: sourcePart.data },
      ];
      for (const ref of refParts) input.push({ type: "image", mime_type: ref.mimeType, data: ref.data });

      // Inline-запрос должен оставаться меньше 20 MB; большие файлы требуют Files API.
      const rawImageBytes = [sourcePart, ...refParts]
        .reduce((sum, image) => sum + Buffer.byteLength(image.data, "base64"), 0);
      if (rawImageBytes + Buffer.byteLength(instruction, "utf8") >= 20 * 1024 * 1024) {
        return { ok: false, internalCostUsd: 0, error: "inline_request_too_large_use_files_api" };
      }

      // 3) Современный Interactions API задаёт формат картинки через response_format.
      const body: any = {
        model: this.opts.model,
        input,
        response_format: { type: "image" },
      };
      if (this.opts.aspectRatio) {
        body.response_format.aspect_ratio = this.opts.aspectRatio;
      }

      // 4) Отправляем запрос.
      const url = `${this.opts.baseUrl}/interactions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": this.opts.apiKey, // ключ идёт в заголовке, не в URL
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Возвращаем ok:false — оркестратор сам решит ретрай/фоллбэк.
        return { ok: false, internalCostUsd: cost, error: `http_${res.status}:${text.slice(0, 300)}` };
      }

      const data: any = await res.json();

      // 5) Ищем финальный image-блок. Поддерживаем snake_case REST и camelCase SDK.
      const blocks: any[] = (data?.steps ?? [])
        .filter((step: any) => step?.type === "model_output")
        .flatMap((step: any) => Array.isArray(step?.content) ? step.content : []);
      const imgPart = blocks.find((part) => part?.type === "image" && part?.data)
        ?? data?.output_image
        ?? data?.outputImage;

      if (!imgPart) {
        // Иногда модель отказывается (safety) и присылает только текст — покажем его в error.
        const textPart = blocks.find((part) => part?.type === "text")?.text;
        return {
          ok: false,
          internalCostUsd: cost,
          error: `no_image_in_response${textPart ? ":" + String(textPart).slice(0, 200) : ""}`,
        };
      }

      // 6) Возвращаем результат как data-URL, чтобы его удобно было и показать, и сохранить.
      const mime = imgPart.mime_type ?? imgPart.mimeType ?? "image/png";
      const outputImage = `data:${mime};base64,${imgPart.data}`;

      return { ok: true, outputImage, internalCostUsd: cost };
    } catch (e: any) {
      return { ok: false, internalCostUsd: cost, error: `exception:${e?.message ?? "unknown"}` };
    }
  }
}

// ----------------------------------------------------------------------------
// Хелпер: любой источник картинки -> { mimeType, data(base64) } для inlineData.
// Поддерживает:
//   1) data-URL:   "data:image/jpeg;base64,...."
//   2) http(s)-URL: скачивает и кодирует
//   3) локальный путь к файлу: читает с диска (удобно для bake-off)
// ----------------------------------------------------------------------------
async function toInlineData(ref: string): Promise<{ mimeType: string; data: string }> {
  // Случай 1: data-URL
  if (ref.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.*)$/s.exec(ref);
    if (!match) throw new Error("bad data URL");
    return { mimeType: match[1], data: match[2] };
  }

  // Случай 2: http(s) — скачиваем байты и кодируем в base64
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`fetch image failed: http_${res.status}`);
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { mimeType, data: buf.toString("base64") };
  }

  // Случай 3: локальный файл (bake-off кладёт фото рядом и передаёт путь)
  const buf = fs.readFileSync(ref);
  return { mimeType: mimeFromPath(ref), data: buf.toString("base64") };
}

/** Простое определение mime по расширению файла. */
function mimeFromPath(p: string): string {
  const lower = p.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg"; // .jpg/.jpeg и всё остальное по умолчанию
}
