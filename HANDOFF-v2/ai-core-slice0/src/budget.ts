// Денежный предохранитель для bake-off.
//
// У него два независимых потолка:
// 1) maxBudgetUsd ограничивает один запуск процесса;
// 2) lifetimeBudgetUsd ограничивает все платные запуски проекта вместе.
//
// Перед сетевым вызовом мы заранее резервируем максимальную заявленную цену.
// Если процесс упадёт посередине, резерв останется расходом. Это намеренно:
// лучше консервативно недопотратить, чем случайно выйти за лимит.

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AICarEditProvider } from "./providers/provider";

export type SpendBlockReason = "paid_provider_blocked" | "budget_exhausted";

export interface SpendGuardOptions {
  maxBudgetUsd: number;
  allowPaidProviders?: boolean;
  /** По умолчанию: PROJECT_DRIVE_LIFETIME_BUDGET_USD или жёсткие $3. */
  lifetimeBudgetUsd?: number;
  /** Подмена нужна тестам; рабочий путь — ai-core-slice0/out/spend-ledger.json. */
  ledgerPath?: string;
}

export interface SpendPermission {
  allowed: true;
  /** Есть только у платного вызова, уже записанного в ledger. */
  reservationId?: string;
  reservedUsd?: number;
}

interface LedgerEntry {
  id: string;
  timestamp: string;
  provider: string;
  reservationId: string;
  kind: "reservation" | "adjustment";
  amountUsd: number;
}

interface SpendLedger {
  version: 1;
  entries: LedgerEntry[];
}

export class SpendGuard {
  private spentUsd = 0;
  readonly maxBudgetUsd: number;
  readonly lifetimeBudgetUsd: number;
  readonly allowPaidProviders: boolean;
  readonly ledgerPath: string;

  constructor(options: SpendGuardOptions) {
    this.maxBudgetUsd = positiveNumber(options.maxBudgetUsd, "maxBudgetUsd");
    this.lifetimeBudgetUsd = positiveNumber(
      options.lifetimeBudgetUsd ?? Number(process.env.PROJECT_DRIVE_LIFETIME_BUDGET_USD ?? 3),
      "lifetimeBudgetUsd",
    );
    this.allowPaidProviders = options.allowPaidProviders === true;
    this.ledgerPath = options.ledgerPath ?? path.resolve(__dirname, "../out/spend-ledger.json");
  }

  /** Быстрая проверка для UI/логики. Окончательная атомарная проверка — start(). */
  canStart(provider: AICarEditProvider): { allowed: true } | { allowed: false; reason: SpendBlockReason } {
    if (provider.billingMode === "paid" && !this.allowPaidProviders) {
      return { allowed: false, reason: "paid_provider_blocked" };
    }
    if (this.spentUsd + provider.maxCostUsdPerCall > this.maxBudgetUsd + Number.EPSILON) {
      return { allowed: false, reason: "budget_exhausted" };
    }
    if (provider.billingMode === "paid" && this.readLifetimeSpentUsd() + provider.maxCostUsdPerCall > this.lifetimeBudgetUsd + Number.EPSILON) {
      return { allowed: false, reason: "budget_exhausted" };
    }
    return { allowed: true };
  }

  /**
   * Вызывается непосредственно перед provider.generateCarEdit(). Для платного
   * провайдера сначала пишет резерв на диск и лишь затем разрешает сетевой вызов.
   */
  start(provider: AICarEditProvider): SpendPermission | { allowed: false; reason: SpendBlockReason } {
    const preliminary = this.canStart(provider);
    if (!preliminary.allowed) return preliminary;
    if (provider.billingMode === "mock") return { allowed: true };

    return this.withLedgerLock(() => {
      const ledger = this.readLedger();
      const reservedUsd = round6(provider.maxCostUsdPerCall);
      const lifetimeSpentUsd = sumLedger(ledger);
      if (lifetimeSpentUsd + reservedUsd > this.lifetimeBudgetUsd + Number.EPSILON) {
        return { allowed: false as const, reason: "budget_exhausted" as const };
      }

      const reservationId = crypto.randomUUID();
      ledger.entries.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        provider: provider.name,
        reservationId,
        kind: "reservation",
        amountUsd: reservedUsd,
      });
      this.writeLedger(ledger);
      this.spentUsd = round6(this.spentUsd + reservedUsd);
      return { allowed: true as const, reservationId, reservedUsd };
    });
  }

  /**
   * После ответа заменяет консервативный резерв фактической ценой. Для mock
   * ledger не меняется. Реальная цена не может быть выше объявленного максимума.
   */
  record(actualCostUsd: number, reservation?: Pick<SpendPermission, "reservationId" | "reservedUsd">): void {
    const actual = nonNegativeNumber(actualCostUsd, "Provider returned an invalid internalCostUsd");
    if (!reservation?.reservationId) {
      this.spentUsd = round6(this.spentUsd + actual);
      return;
    }

    const reserved = reservation.reservedUsd ?? 0;
    const adjustment = round6(actual - reserved);
    this.spentUsd = round6(this.spentUsd + adjustment);
    if (Math.abs(adjustment) <= Number.EPSILON) return;

    this.withLedgerLock(() => {
      const ledger = this.readLedger();
      ledger.entries.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        provider: "reconciliation",
        reservationId: reservation.reservationId!,
        kind: "adjustment",
        amountUsd: adjustment,
      });
      this.writeLedger(ledger);
    });

    if (actual > reserved + Number.EPSILON) {
      throw new Error("Provider cost exceeded maxCostUsdPerCall; ledger was corrected, paid runs are stopped");
    }
  }

  snapshot() {
    const lifetimeSpentUsd = this.readLifetimeSpentUsd();
    return {
      maxBudgetUsd: this.maxBudgetUsd,
      spentUsd: this.spentUsd,
      remainingUsd: round6(Math.max(0, this.maxBudgetUsd - this.spentUsd)),
      lifetimeBudgetUsd: this.lifetimeBudgetUsd,
      lifetimeSpentUsd,
      lifetimeRemainingUsd: round6(Math.max(0, this.lifetimeBudgetUsd - lifetimeSpentUsd)),
      ledgerPath: this.ledgerPath,
      allowPaidProviders: this.allowPaidProviders,
    };
  }

  private readLifetimeSpentUsd(): number {
    return sumLedger(this.readLedger());
  }

  private readLedger(): SpendLedger {
    if (!fs.existsSync(this.ledgerPath)) return { version: 1, entries: [] };
    const parsed = JSON.parse(fs.readFileSync(this.ledgerPath, "utf8")) as Partial<SpendLedger>;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      throw new Error(`Invalid spend ledger: ${this.ledgerPath}`);
    }
    for (const entry of parsed.entries) {
      if (!Number.isFinite(entry.amountUsd)) throw new Error(`Invalid spend ledger entry: ${this.ledgerPath}`);
    }
    return parsed as SpendLedger;
  }

  private writeLedger(ledger: SpendLedger): void {
    fs.mkdirSync(path.dirname(this.ledgerPath), { recursive: true });
    const temporary = `${this.ledgerPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, this.ledgerPath);
  }

  private withLedgerLock<T>(callback: () => T): T {
    fs.mkdirSync(path.dirname(this.ledgerPath), { recursive: true });
    const lockPath = `${this.ledgerPath}.lock`;
    let handle: number;
    try {
      handle = fs.openSync(lockPath, "wx");
    } catch (error: any) {
      if (error?.code === "EEXIST") throw new Error(`Spend ledger is locked by another process: ${lockPath}`);
      throw error;
    }
    try {
      return callback();
    } finally {
      fs.closeSync(handle);
      fs.unlinkSync(lockPath);
    }
  }
}

function sumLedger(ledger: SpendLedger): number {
  return round6(ledger.entries.reduce((sum, entry) => sum + entry.amountUsd, 0));
}

function positiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
}

function nonNegativeNumber(value: number, message: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(message);
  return value;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
