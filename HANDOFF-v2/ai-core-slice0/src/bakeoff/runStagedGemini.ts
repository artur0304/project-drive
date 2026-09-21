// Платный runner только для момента, когда владелец явно разрешил конкретный этап.
// Сам файл ничего не запускает без API-ключа, одноразового paid-флага и этапных ворот.

import * as path from "path";
import { ProviderRegistry } from "../providers";
import { GeminiCarEditProvider } from "../providers/geminiProvider";
import { loadBakeoffManifest } from "./manifest";
import { runBakeoff, type BakeoffCandidate } from "./runBakeoff";
import { buildStage1Cases, buildStage2Cases, buildStage3Cases, parseOperationList, type BakeoffStage } from "./stagePlan";

async function main() {
  const stage = process.argv[2] as BakeoffStage | undefined;
  if (!stage || !["stage1", "stage2", "stage3"].includes(stage)) throw new Error("Choose exactly one stage");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing; paid run was not started");
  if (process.env.PROJECT_DRIVE_ALLOW_PAID_AI !== "YES_FOR_THIS_RUN") {
    throw new Error("Fresh approval is missing; paid run was not started");
  }

  const manifestFile = path.resolve(__dirname, "../../../../bakeoff/cases.json");
  const { cases, coverage } = loadBakeoffManifest(manifestFile);
  let selectedCases;
  let candidates: BakeoffCandidate[];
  let runLimitUsd: number;

  if (stage === "stage1") {
    selectedCases = buildStage1Cases(cases);
    candidates = [geminiCandidate(apiKey, "gemini-lite", "gemini-3.1-flash-lite-image", 0.05)];
    runLimitUsd = 0.50;
  } else if (stage === "stage2") {
    const approved = parseOperationList(process.env.PROJECT_DRIVE_STAGE2_OPERATIONS ?? process.argv[3]);
    selectedCases = buildStage2Cases(cases, approved);
    candidates = [
      geminiCandidate(apiKey, "gemini-lite", "gemini-3.1-flash-lite-image", 0.05),
      geminiCandidate(apiKey, "gemini-flash", "gemini-3.1-flash-image", 0.09),
    ];
    runLimitUsd = 2.50;
  } else {
    if (process.env.PROJECT_DRIVE_ALLOW_STAGE3 !== "YES_AFTER_REVIEW") {
      throw new Error("Stage 3 needs separate approval after Stage 2 review");
    }
    if (!coverage.ready) throw new Error(`Stage 3 dataset is incomplete:\n- ${coverage.gaps.join("\n- ")}`);
    selectedCases = buildStage3Cases(cases);
    candidates = [
      geminiCandidate(apiKey, "gemini-lite", "gemini-3.1-flash-lite-image", 0.05),
      geminiCandidate(apiKey, "gemini-flash", "gemini-3.1-flash-image", 0.09),
    ];
    runLimitUsd = 3;
  }

  const outDir = path.resolve(__dirname, `../../out/${stage}-gemini`);
  const rows = await runBakeoff(selectedCases, candidates, outDir, {
    maxBudgetUsd: runLimitUsd,
    allowPaidProviders: true,
  });
  console.log(`${stage} Gemini run complete: ${rows.length} renders. Open ${path.join(outDir, "bakeoff_report.html")}`);
  if (stage !== "stage3") console.log("STOP: do not start the next stage before human scoring and a new explicit approval.");
}

function geminiCandidate(apiKey: string, label: string, model: string, conservativeCostUsd: number): BakeoffCandidate {
  return {
    label,
    retriesSameProvider: 0,
    registry: new ProviderRegistry({ primary: label }).register(new GeminiCarEditProvider({
      name: label,
      apiKey,
      model,
      // В ledger остаётся консервативная сумма, чтобы запоздавший billing не пробил потолок.
      estimatedCostUsd: conservativeCostUsd,
    })),
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
