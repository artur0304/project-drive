import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { analyzePhotoReadiness, formatPhotoReadiness } from "./photoReadiness";

const manifest = path.resolve(__dirname, "../../../../bakeoff/cases.json");
const inbox = fs.mkdtempSync(path.join(os.tmpdir(), "project-drive-photos-"));
try {
  for (const name of ["car-shadow.jpg", "car-rear.jpg", "car-wheel-closeup.jpg"]) fs.writeFileSync(path.join(inbox, name), "test");
  const status = analyzePhotoReadiness(manifest, inbox);
  assert.equal(status.total, 7);
  assert.equal(status.stage1Ready, true);
  assert.deepEqual(status.missing, { shadow: 1, rear: 0, wheelCloseup: 2 });
  assert.match(formatPhotoReadiness(status), /Фото: 7 из 15/);
} finally {
  fs.rmSync(inbox, { recursive: true, force: true });
}
console.log("✅ Photo readiness reports totals and missing shooting conditions in plain language.");
