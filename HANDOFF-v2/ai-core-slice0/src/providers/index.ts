// ============================================================================
// Реестр провайдеров + роутинг по операции.
// ТЗ допускает разные провайдеры под разные операции
// (напр. один для wrap, другой для wheel_replace) и fallback.
// ============================================================================

import type { AICarEditProvider } from "./provider";
import type { OperationKind } from "../types";

export interface RoutingRule {
  /** Приоритетный провайдер для операции. */
  primary: string;
  /** Провайдер-фоллбэк, если primary упал после ретрая. */
  fallback?: string;
}

export class ProviderRegistry {
  private providers = new Map<string, AICarEditProvider>();
  private routing = new Map<OperationKind, RoutingRule>();
  private defaultRule: RoutingRule;

  constructor(defaultRule: RoutingRule) {
    this.defaultRule = defaultRule;
  }

  register(provider: AICarEditProvider): this {
    this.providers.set(provider.name, provider);
    return this;
  }

  /** Задать провайдера(ов) для конкретной операции. */
  setRoute(op: OperationKind, rule: RoutingRule): this {
    this.routing.set(op, rule);
    return this;
  }

  get(name: string): AICarEditProvider {
    const p = this.providers.get(name);
    if (!p) throw new Error(`Provider not registered: ${name}`);
    return p;
  }

  /** Правило роутинга для набора операций. Пока берём правило по первой операции (batch). */
  ruleFor(ops: OperationKind[]): RoutingRule {
    const first = ops[0];
    return (first && this.routing.get(first)) ?? this.defaultRule;
  }
}
