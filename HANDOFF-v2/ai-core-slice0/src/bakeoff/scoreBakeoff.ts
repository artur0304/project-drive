import * as fs from "fs";
import * as path from "path";
import { summarizeQuality } from "./runBakeoff";

const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "../../out");
const scoredFile = path.join(outDir, "bakeoff_scoring_template.json");
const blindKeyFile = path.join(outDir, "bakeoff_blind_key.json");
const summary = summarizeQuality(scoredFile, blindKeyFile);
const summaryFile = path.join(outDir, "bakeoff_quality_summary.json");
fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
console.log(`Quality summary saved: ${summaryFile}`);
