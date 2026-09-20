import * as path from "path";
import { loadBakeoffManifest } from "./manifest";

const defaultManifest = path.resolve(__dirname, "../../../../bakeoff/cases.json");
const manifest = process.argv[2] ? path.resolve(process.argv[2]) : defaultManifest;
const { coverage } = loadBakeoffManifest(manifest);

console.log(`Bake-off manifest: ${manifest}`);
console.log(`Unique car photos: ${coverage.uniquePhotos}`);
console.log(`Cases: ${coverage.totalCases}`);
for (const [operation, count] of Object.entries(coverage.operationCases)) {
  console.log(`${operation}: ${count}`);
}
console.log(`Status: ${coverage.ready ? "READY" : "NOT READY"}`);
for (const gap of coverage.gaps) console.log(`- ${gap}`);
