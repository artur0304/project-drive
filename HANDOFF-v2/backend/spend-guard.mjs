import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const cents = (value) => Math.round(Number(value) * 100);
const today = () => new Date().toISOString().slice(0, 10);

// A small durable ledger protects the real provider wallet across restarts.
export class SpendGuard {
  constructor({
    ledgerPath = process.env.PROJECT_DRIVE_SPEND_LEDGER || resolve('out/spend-ledger.json'),
    lifetimeBudgetUsd = Number(process.env.PROJECT_DRIVE_LIFETIME_BUDGET_USD || 5),
    dailyBudgetUsd = Number(process.env.PROJECT_DRIVE_DAILY_BUDGET_USD || 2),
  } = {}) {
    this.path = ledgerPath;
    this.lifetimeLimit = cents(lifetimeBudgetUsd);
    this.dailyLimit = cents(dailyBudgetUsd);
  }

  read() {
    if (!existsSync(this.path)) return { version: 1, entries: [] };
    try {
      const parsed = JSON.parse(readFileSync(this.path, 'utf8'));
      return parsed?.version === 1 && Array.isArray(parsed.entries) ? parsed : { version: 1, entries: [] };
    } catch { throw new Error('spend_ledger_invalid'); }
  }

  totals(ledger = this.read()) {
    const committed = ledger.entries.filter((entry) => entry.status !== 'released');
    return {
      lifetimeCents: committed.reduce((sum, entry) => sum + entry.amountCents, 0),
      dailyCents: committed.filter((entry) => entry.day === today()).reduce((sum, entry) => sum + entry.amountCents, 0),
    };
  }

  reserve(expectedUsd, metadata = {}) {
    const amountCents = cents(expectedUsd);
    if (amountCents <= 0) throw new Error('invalid_expected_cost');
    const ledger = this.read();
    const totals = this.totals(ledger);
    if (totals.lifetimeCents + amountCents > this.lifetimeLimit) throw new Error('lifetime_budget_exceeded');
    if (totals.dailyCents + amountCents > this.dailyLimit) throw new Error('daily_budget_exceeded');
    const id = crypto.randomUUID();
    ledger.entries.push({ id, day: today(), at: new Date().toISOString(), amountCents, status: 'reserved', ...metadata });
    this.write(ledger);
    return id;
  }

  settle(id, actualUsd) {
    const ledger = this.read();
    const entry = ledger.entries.find((item) => item.id === id);
    if (!entry) throw new Error('spend_reservation_missing');
    entry.amountCents = cents(actualUsd);
    entry.status = 'settled';
    entry.settledAt = new Date().toISOString();
    this.write(ledger);
  }

  release(id) {
    const ledger = this.read();
    const entry = ledger.entries.find((item) => item.id === id);
    if (entry) {
      entry.status = 'released';
      entry.releasedAt = new Date().toISOString();
      this.write(ledger);
    }
  }

  write(ledger) {
    mkdirSync(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temp, `${JSON.stringify(ledger, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(temp, this.path);
  }
}

