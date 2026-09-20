import assert from "node:assert/strict";
import * as path from "path";
import { loadBakeoffManifest } from "./manifest";

const manifest = path.resolve(__dirname, "../../../../bakeoff/cases.json");
const { cases, coverage } = loadBakeoffManifest(manifest);

assert.equal(cases.length, 4);
assert.equal(coverage.uniquePhotos, 4);
assert.equal(coverage.operationCases.wrap, 4);
assert.equal(coverage.operationCases.tint, 4);
assert.equal(coverage.operationCases.wheel_replace, 4);
assert.equal(coverage.operationCases.wheel_recolor, 0);
assert.equal(coverage.ready, false);
assert.ok(coverage.gaps.some((gap) => gap.includes("11 more unique car photos")));
assert.ok(cases.every((item) => path.isAbsolute(item.sourceImage)));
assert.ok(cases.every((item) => item.operations.some((operation) =>
  operation.kind === "wheel_replace" && operation.referenceImageUrls.every(path.isAbsolute))));

console.log("✅ Bake-off manifest files, operations and coverage gaps are valid.");
