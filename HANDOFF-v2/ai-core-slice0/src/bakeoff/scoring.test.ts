import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { summarizeQuality } from "./runBakeoff";

const commonScores = {
  car_identity_preserved: 5,
  geometry_preserved: 4,
  background_preserved: 4,
  lighting_believable: 4,
  target_modification_accurate: 4,
  no_unwanted_changes: 4,
};

function writeJson(file: string, value: unknown) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "project-drive-score-"));
  const scoredFile = path.join(dir, "scores.json");
  const keyFile = path.join(dir, "key.json");
  try {
    writeJson(scoredFile, [{ renderId: "render-1", operationKinds: ["wrap"], scores: { car_identity_preserved: 5 } }]);
    writeJson(keyFile, [{ renderId: "render-1", candidate: "candidate-a" }]);
    assert.throws(() => summarizeQuality(scoredFile, keyFile), /geometry_preserved must be an integer/);

    writeJson(scoredFile, [
      { renderId: "render-1", operationKinds: ["wrap"], scores: commonScores },
      { renderId: "render-2", operationKinds: ["wrap"], scores: Object.fromEntries(Object.keys(commonScores).map((key) => [key, 3])) },
    ]);
    writeJson(keyFile, [
      { renderId: "render-1", candidate: "candidate-a" },
      { renderId: "render-2", candidate: "candidate-b" },
    ]);
    const summary = summarizeQuality(scoredFile, keyFile);
    assert.equal(summary.byOperation.wrap.total, 2);
    assert.equal(summary.byOperation.wrap.accepted, 1);
    assert.equal(summary.byCandidate["candidate-a"].verdict, "PASS");
    assert.equal(summary.byCandidate["candidate-b"].verdict, "NO-GO");
    assert.equal(summary.byCandidateOperation["candidate-a"].wrap.verdict, "PASS");
    assert.equal(summary.byCandidateOperation["candidate-b"].wrap.verdict, "NO-GO");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log("✅ Incomplete scores are rejected and blind candidate summaries are calculated.");
}

main();
