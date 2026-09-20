import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ProviderRegistry } from "../providers";
import { MockAIProvider } from "../providers/mockProvider";
import { runBakeoff, type BakeoffCandidate, type BakeoffCase } from "./runBakeoff";

const testCase: BakeoffCase = {
  caseId: "matrix-case",
  photoLabel: "same car for every candidate",
  sourceImage: "demo://car.jpg",
  operations: [{ kind: "tint", level: "medium" }],
};
const candidates: BakeoffCandidate[] = [
  {
    label: "candidate-a",
    retriesSameProvider: 0,
    registry: new ProviderRegistry({ primary: "mock-a" })
      .register(new MockAIProvider({ name: "mock-a", costUsd: 0.01, latencyMsRange: [0, 0] })),
  },
  {
    label: "candidate-b",
    retriesSameProvider: 0,
    registry: new ProviderRegistry({ primary: "mock-b" })
      .register(new MockAIProvider({ name: "mock-b", costUsd: 0.02, latencyMsRange: [0, 0] })),
  },
];

async function main() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "project-drive-bakeoff-"));
  try {
    const rows = await runBakeoff([testCase], candidates, outDir, {
      maxBudgetUsd: 1,
      allowPaidProviders: false,
    });
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((row) => row.candidate), ["candidate-a", "candidate-b"]);
    assert.deepEqual(rows.map((row) => row.provider), ["mock-a", "mock-b"]);
    assert.ok(rows.every((row) => row.caseId === testCase.caseId && row.ok));
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "bakeoff_run_manifest.json"), "utf8"));
    assert.equal(manifest.renderRequests, 2);
    assert.equal(manifest.successfulRenders, 2);
    assert.deepEqual(manifest.candidates, ["candidate-a", "candidate-b"]);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  console.log("✅ Every bake-off case runs independently through every candidate.");
}

main();
