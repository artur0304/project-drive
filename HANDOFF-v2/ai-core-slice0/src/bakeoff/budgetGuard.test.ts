import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SpendGuard } from "../budget";
import { GenerationOrchestrator } from "../orchestrator";
import { ProviderRegistry } from "../providers";
import { MockAIProvider } from "../providers/mockProvider";
import type { AICarEditProvider } from "../providers/provider";
import { runBakeoff } from "./runBakeoff";

const request = {
  sourceImage: "demo://car.jpg",
  operations: [{ kind: "tint" as const, level: "medium" as const }],
};

async function testBudgetStopsBeforeNextCall() {
  const guard = new SpendGuard({ maxBudgetUsd: 0.05 });
  const registry = new ProviderRegistry({ primary: "mock" })
    .register(new MockAIProvider({ name: "mock", costUsd: 0.04, latencyMsRange: [0, 0] }));
  const orchestrator = new GenerationOrchestrator(registry, { retriesSameProvider: 0, spendGuard: guard });

  assert.equal((await orchestrator.run(request)).ok, true);
  const blocked = await orchestrator.run(request);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.failureReason, "budget_exhausted");
  assert.equal(blocked.attempts.length, 0);
  assert.equal(guard.snapshot().spentUsd, 0.04);
}

async function testPaidProviderIsNeverCalledWithoutApproval() {
  let called = false;
  const paid: AICarEditProvider = {
    name: "paid-test",
    billingMode: "paid",
    maxCostUsdPerCall: 0.01,
    async generateCarEdit() {
      called = true;
      return { ok: true, outputImage: "should-not-exist", internalCostUsd: 0.01 };
    },
  };
  const registry = new ProviderRegistry({ primary: paid.name }).register(paid);
  const spendGuard = new SpendGuard({ maxBudgetUsd: 2, allowPaidProviders: false });
  const result = await new GenerationOrchestrator(registry, { retriesSameProvider: 0, spendGuard }).run(request);

  assert.equal(result.ok, false);
  assert.equal(result.failureReason, "paid_provider_blocked");
  assert.equal(result.attempts.length, 0);
  assert.equal(called, false);
  assert.equal(spendGuard.snapshot().spentUsd, 0);
}

async function testPaidRunNeedsOneTimeEnvironmentConfirmation() {
  const previous = process.env.PROJECT_DRIVE_ALLOW_PAID_AI;
  delete process.env.PROJECT_DRIVE_ALLOW_PAID_AI;
  try {
    const registry = new ProviderRegistry({ primary: "mock" })
      .register(new MockAIProvider({ name: "mock", costUsd: 0.01, latencyMsRange: [0, 0] }));
    await assert.rejects(
      () => runBakeoff([], [{ label: "mock", registry }], "unused-test-output", { maxBudgetUsd: 2, allowPaidProviders: true }),
      /Paid AI is locked/,
    );
  } finally {
    if (previous === undefined) delete process.env.PROJECT_DRIVE_ALLOW_PAID_AI;
    else process.env.PROJECT_DRIVE_ALLOW_PAID_AI = previous;
  }
}

async function testLifetimeLedgerSurvivesRestart() {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "project-drive-ledger-"));
  const ledgerPath = path.join(testDir, "spend-ledger.json");
  let calls = 0;
  const paid: AICarEditProvider = {
    name: "paid-ledger-test",
    billingMode: "paid",
    maxCostUsdPerCall: 1.6,
    async generateCarEdit() {
      calls += 1;
      return { ok: true, outputImage: "demo://result.jpg", internalCostUsd: 1.5 };
    },
  };
  const registry = new ProviderRegistry({ primary: paid.name }).register(paid);

  const firstProcess = new SpendGuard({
    maxBudgetUsd: 3,
    lifetimeBudgetUsd: 3,
    ledgerPath,
    allowPaidProviders: true,
  });
  assert.equal((await new GenerationOrchestrator(registry, { retriesSameProvider: 0, spendGuard: firstProcess }).run(request)).ok, true);
  assert.equal(firstProcess.snapshot().lifetimeSpentUsd, 1.5);

  // Новый объект имитирует полный перезапуск. Он обязан прочитать предыдущие
  // $1.50 и заблокировать резерв $1.60 до сетевого вызова.
  const restartedProcess = new SpendGuard({
    maxBudgetUsd: 3,
    lifetimeBudgetUsd: 3,
    ledgerPath,
    allowPaidProviders: true,
  });
  const blocked = await new GenerationOrchestrator(registry, { retriesSameProvider: 0, spendGuard: restartedProcess }).run(request);
  assert.equal(blocked.failureReason, "budget_exhausted");
  assert.equal(calls, 1);
  assert.equal(restartedProcess.snapshot().lifetimeRemainingUsd, 1.5);
}

async function main() {
  await testBudgetStopsBeforeNextCall();
  await testPaidProviderIsNeverCalledWithoutApproval();
  await testPaidRunNeedsOneTimeEnvironmentConfirmation();
  await testLifetimeLedgerSurvivesRestart();
  console.log("✅ Paid providers stay locked; run and lifetime budgets stop calls before overspend.");
}

main();
