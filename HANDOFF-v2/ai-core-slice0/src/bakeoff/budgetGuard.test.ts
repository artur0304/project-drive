import assert from "node:assert/strict";
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

async function main() {
  await testBudgetStopsBeforeNextCall();
  await testPaidProviderIsNeverCalledWithoutApproval();
  await testPaidRunNeedsOneTimeEnvironmentConfirmation();
  console.log("✅ Paid providers stay locked and the bake-off budget stops new calls before overspend.");
}

main();
