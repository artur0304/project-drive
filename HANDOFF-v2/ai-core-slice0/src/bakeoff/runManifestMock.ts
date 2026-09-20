// Полный локальный dry-run на настоящем manifest и настоящих исходных файлах.
// Использует только MockAIProvider: сети, API-ключей и реальных расходов здесь нет.

import * as path from "path";
import { ProviderRegistry } from "../providers";
import { MockAIProvider } from "../providers/mockProvider";
import { loadBakeoffManifest } from "./manifest";
import { runBakeoff, type BakeoffCandidate } from "./runBakeoff";

async function main() {
  const defaultManifest = path.resolve(__dirname, "../../../../bakeoff/cases.json");
  const manifestFile = process.argv[2] ? path.resolve(process.argv[2]) : defaultManifest;
  const outDir = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.resolve(__dirname, "../../out/manifest-mock");
  const { cases, coverage } = loadBakeoffManifest(manifestFile);

  if (!coverage.ready) {
    console.log("Dataset status: NOT READY for a paid decision. Safe mock dry-run will continue.");
    for (const gap of coverage.gaps) console.log(`- ${gap}`);
  }

  const candidates: BakeoffCandidate[] = [
    {
      label: "mock-baseline-a",
      retriesSameProvider: 0,
      registry: new ProviderRegistry({ primary: "mock-baseline-a" })
        .register(new MockAIProvider({
          name: "mock-baseline-a", failureRate: 0, latencyMsRange: [0, 0], costUsd: 0.04,
        })),
    },
    {
      label: "mock-baseline-b",
      retriesSameProvider: 0,
      registry: new ProviderRegistry({ primary: "mock-baseline-b" })
        .register(new MockAIProvider({
          name: "mock-baseline-b", failureRate: 0, latencyMsRange: [0, 0], costUsd: 0.06,
        })),
    },
  ];

  const rows = await runBakeoff(cases, candidates, outDir, {
    maxBudgetUsd: 2,
    allowPaidProviders: false,
  });
  console.log(`Mock manifest run complete: ${rows.length} renders saved in ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
