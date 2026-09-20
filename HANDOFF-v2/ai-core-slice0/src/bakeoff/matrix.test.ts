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
  sourceImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
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
    assert.ok(rows.every((row) => row.outputImage?.startsWith("images/render-") && row.outputImage.endsWith(".png")));
    assert.ok(rows.every((row) => fs.existsSync(path.join(outDir, row.outputImage!))));
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "bakeoff_run_manifest.json"), "utf8"));
    assert.equal(manifest.renderRequests, 2);
    assert.equal(manifest.successfulRenders, 2);
    assert.deepEqual(manifest.candidates, ["candidate-a", "candidate-b"]);
    const scoring = JSON.parse(fs.readFileSync(path.join(outDir, "bakeoff_scoring_template.json"), "utf8"));
    assert.equal(scoring.length, 2);
    assert.ok(scoring.every((row: Record<string, unknown>) =>
      !Object.prototype.hasOwnProperty.call(row, "candidate") &&
      !Object.prototype.hasOwnProperty.call(row, "provider")));
    const blindKey = JSON.parse(fs.readFileSync(path.join(outDir, "bakeoff_blind_key.json"), "utf8"));
    assert.deepEqual(blindKey.map((row: { candidate: string }) => row.candidate), ["candidate-a", "candidate-b"]);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  console.log("✅ Every bake-off case runs independently through every candidate.");
}

main();
