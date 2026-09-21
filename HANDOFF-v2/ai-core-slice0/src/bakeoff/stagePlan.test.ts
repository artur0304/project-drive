import assert from "node:assert/strict";
import type { BakeoffCase } from "./runBakeoff";
import { buildStage1Cases, buildStage2Cases, parseOperationList } from "./stagePlan";

const sourceCases: BakeoffCase[] = [1, 2, 3].map((number) => ({
  caseId: `photo-${number}`,
  photoLabel: `Photo ${number}`,
  sourceImage: `photo-${number}.jpg`,
  operations: [
    { kind: "wrap", finish: "gloss", colorName: "Green", colorHex: "#0B4D3A" },
    { kind: "tint", level: "none" },
    { kind: "wheel_replace", wheelVariantId: "wheel", label: "Wheel", referenceImageUrls: ["wheel.jpg"] },
  ],
}));

const stage1 = buildStage1Cases(sourceCases);
assert.equal(stage1.length, 8);
assert.equal(new Set(stage1.map((item) => item.sourceImage)).size, 2);
assert.deepEqual(new Set(stage1.flatMap((item) => item.operations.map((operation) => operation.kind))),
  new Set(["wrap", "tint", "wheel_recolor", "wheel_replace"]));
assert.equal(stage1.find((item) => item.operations[0].kind === "wheel_recolor")?.operations[0].kind, "wheel_recolor");

const stage2 = buildStage2Cases(sourceCases, parseOperationList("wrap,tint,wrap"));
assert.equal(stage2.length, 6);
assert.equal(new Set(stage2.map((item) => item.sourceImage)).size, 3);
assert.throws(() => buildStage2Cases(sourceCases, []), /human-approved operation/);
assert.throws(() => parseOperationList("wrap,magic"), /Unknown operations/);

console.log("✅ Stages select the required photos and operations and enforce the human pause.");
