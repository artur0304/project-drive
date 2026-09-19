// ============================================================================
// Slice 0 — базовые типы AI-ядра.
// Всё, что связано с одной операцией редактирования фото машины.
// Фреймворк-независимо: НЕ импортирует Next.js/React. Это чистая доменная логика.
// ============================================================================

/** Четыре операции MVP. Больше в Slice 0 ничего не добавляем. */
export type OperationKind = "wrap" | "tint" | "wheel_recolor" | "wheel_replace";

/** Финиш плёнки/краски. */
export type WrapFinish = "gloss" | "satin" | "matte" | "metallic" | "pearl";

/** Уровень тонировки (visible light transmission). */
export type TintLevel = "none" | "light" | "medium" | "limo" | "blackout";

// --- Конфиги отдельных операций (structured draft, не текст) ---

export interface WrapConfig {
  kind: "wrap";
  finish: WrapFinish;
  /** Человеко-читаемое имя цвета, напр. "Racing Green". */
  colorName: string;
  /** HEX для подсказки модели, напр. "#3E5B44". */
  colorHex: string;
}

export interface TintConfig {
  kind: "tint";
  level: TintLevel;
}

export interface WheelRecolorConfig {
  kind: "wheel_recolor";
  colorName: string;
  colorHex: string;
  finish: "gloss" | "satin" | "matte" | "chrome" | "brushed";
}

export interface WheelReplaceConfig {
  kind: "wheel_replace";
  /** ID диска в каталоге (для логов/аналитики). */
  wheelVariantId: string;
  /** Человеко-читаемо: "BMW Style 437M · R20 · Ferric Grey". */
  label: string;
  /**
   * КЛЮЧЕВОЕ: точные reference-картинки конкретного диска.
   * AI НЕ должен ориентироваться только на название — ему передаётся изображение.
   */
  referenceImageUrls: string[];
}

export type OperationConfig =
  | WrapConfig
  | TintConfig
  | WheelRecolorConfig
  | WheelReplaceConfig;

/** Полный запрос на одну генерацию (может содержать несколько операций — Planner). */
export interface GenerationRequest {
  /** URL или base64 исходного фото машины пользователя. */
  sourceImage: string;
  /** Операции, собранные в draft. Пустой массив недопустим. */
  operations: OperationConfig[];
  /** Необязательный свободный текст из AI Command (уже распарсенный в operations выше; здесь — только для лога). */
  rawUserPrompt?: string;
}

// --- Результаты и логи ---

export interface GenerationResult {
  /** true только если есть валидный выходной образ. */
  ok: boolean;
  /** URL/base64 результата, если ok. */
  outputImage?: string;
  /** Имя провайдера, чей результат принят. */
  providerUsed?: string;
  /** Полный лог всех попыток (retry/fallback) — для админки и bake-off. */
  attempts: AttemptLog[];
  /** Суммарный внутренний расход по всем попыткам (в долларах). Может быть > 0 даже при ok=false. */
  totalInternalCostUsd: number;
  /** Суммарная задержка от старта до финального ответа (мс). */
  totalLatencyMs: number;
  /** Тип провала, если ok=false. */
  failureReason?: "all_providers_failed" | "invalid_request";
}

/** Лог одной попытки у одного провайдера. */
export interface AttemptLog {
  provider: string;
  operationKinds: OperationKind[];
  ok: boolean;
  latencyMs: number;
  internalCostUsd: number;
  /** Причина, если провайдер вернул ошибку. */
  error?: string;
  /** Тип попытки: первичная, ретрай того же провайдера, фоллбэк на другого. */
  attemptType: "primary" | "retry" | "fallback";
}

/** Ответ одного провайдера на один вызов generateCarEdit. */
export interface ProviderResult {
  ok: boolean;
  outputImage?: string;
  /** Реальный внутренний расход этого вызова (USD). */
  internalCostUsd: number;
  error?: string;
}
