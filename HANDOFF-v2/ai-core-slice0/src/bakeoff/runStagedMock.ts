// Проверяет этапный процесс только на mock-провайдерах: сеть и деньги не используются.
// Реальные адаптеры подключаются к тем же планам отдельным paid-runner после выбора моделей.

import * as path from "path";
import { ProviderRegistry } from "../providers";
import { MockAIProvider } from "../providers/mockProvider";
import { loadBakeoffManifest } from "./manifest";
import { runBakeoff, type BakeoffCandidate } from "./runBakeoff";
import { buildStage1Cases, buildStage2Cases, buildStage3Cases, parseOperationList, type BakeoffStage } from "./stagePlan";

async function main() {
  const stage = process.argv[2] as BakeoffStage | undefined;
  if (!stage || !["stage1", "stage2", "stage3"].includes(stage)) {
    throw new Error("Choose exactly one stage: stage1, stage2 or stage3");
  }
  const manifestFile = path.resolve(__dirname, "../../../../bakeoff/cases.json");
  const { cases, coverage } = loadBakeoffManifest(manifestFile);

  let selectedCases;
  let candidates: BakeoffCandidate[];
  if (stage === "stage1") {
    selectedCases = buildStage1Cases(cases);
    candidates = [mockCandidate("mock-cheapest", 0.02)];
  } else if (stage === "stage2") {
    const approved = parseOperationList(process.env.PROJECT_DRIVE_STAGE2_OPERATIONS ?? process.argv[3]);
    selectedCases = buildStage2Cases(cases, approved);
    candidates = [mockCandidate("mock-candidate-a", 0.02), mockCandidate("mock-candidate-b", 0.04)];
  } else {
    if (process.env.PROJECT_DRIVE_ALLOW_STAGE3 !== "YES_AFTER_REVIEW") {
      throw new Error("Stage 3 is locked. Set PROJECT_DRIVE_ALLOW_STAGE3=YES_AFTER_REVIEW only after human review of Stage 2.");
    }
    if (!coverage.ready) throw new Error(`Stage 3 dataset is incomplete:\n- ${coverage.gaps.join("\n- ")}`);
    selectedCases = buildStage3Cases(cases);
    candidates = [mockCandidate("mock-candidate-a", 0.02), mockCandidate("mock-candidate-b", 0.04)];
  }

  const outDir = path.resolve(__dirname, `../../out/${stage}-mock`);
  const rows = await runBakeoff(selectedCases, candidates, outDir, { maxBudgetUsd: 3, allowPaidProviders: false });
  console.log(`${stage} mock complete: ${rows.length} renders. Open ${path.join(outDir, "bakeoff_report.html")}`);
  if (stage !== "stage3") console.log("STOP: score and review this stage before starting the next command.");
}

function mockCandidate(label: string, costUsd: number): BakeoffCandidate {
  return {
    label,
    retriesSameProvider: 0,
    registry: new ProviderRegistry({ primary: label }).register(new MockAIProvider({
      name: label, failureRate: 0, latencyMsRange: [0, 0], costUsd,
    })),
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
