// ============================================================================
// Bake-off harness — главный deliverable Slice 0.
// Гоняет: фото × операции × провайдеры, собирает latency / cost / attempts / success,
// сохраняет результаты и печатает сводку по стоимости.
//
// Качество (acceptance) оценивается РУЧНОЙ рубрикой ПОСЛЕ прогона:
// harness сохраняет выходные картинки + пустой scoring-шаблон (JSON), человек его заполняет,
// затем summarizeQuality() считает acceptance rate и вердикт go/no-go по каждой операции.
//
// Запуск (в твоём окружении, где есть ключи и интернет):
//   ts-node src/bakeoff/runBakeoff.ts
// С mock-провайдерами скрипт работает и без сети — для проверки самой машинерии.
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import type { GenerationRequest, OperationConfig, OperationKind } from "../types";
import { GenerationOrchestrator } from "../orchestrator";
import { ProviderRegistry } from "../providers";
import { MockAIProvider } from "../providers/mockProvider";
import { SpendGuard } from "../budget";
import {
  RUBRIC_CRITERIA,
  RubricScore,
  isAccepted,
  PASS_RATE,
} from "./rubric";

// --- Вход: набор тестовых фото и операций к каждому ---

export interface BakeoffCase {
  caseId: string; // напр. "photo01_wrap_green"
  photoLabel: string; // "BMW M4 front 3/4"
  sourceImage: string; // url/base64
  operations: OperationConfig[];
}

interface BakeoffRow {
  caseId: string;
  photoLabel: string;
  operationKinds: OperationKind[];
  provider: string;
  ok: boolean;
  attemptsCount: number;
  totalLatencyMs: number;
  totalInternalCostUsd: number;
  failureReason?: string;
  outputImage?: string;
}

export interface BakeoffSafetyOptions {
  maxBudgetUsd: number;
  allowPaidProviders?: boolean;
}

export async function runBakeoff(
  cases: BakeoffCase[],
  registry: ProviderRegistry,
  outDir: string,
  safety: BakeoffSafetyOptions
): Promise<BakeoffRow[]> {
  // Одного boolean недостаточно: для платного запуска оператор должен ещё
  // выставить одноразовое подтверждение в окружении именно этой команды.
  if (safety.allowPaidProviders && process.env.PROJECT_DRIVE_ALLOW_PAID_AI !== "YES_FOR_THIS_RUN") {
    throw new Error("Paid AI is locked. Set PROJECT_DRIVE_ALLOW_PAID_AI=YES_FOR_THIS_RUN only after explicit approval.");
  }
  const spendGuard = new SpendGuard(safety);
  const orchestrator = new GenerationOrchestrator(registry, { retriesSameProvider: 1, spendGuard });
  const rows: BakeoffRow[] = [];

  for (const c of cases) {
    const req: GenerationRequest = {
      sourceImage: c.sourceImage,
      operations: c.operations,
    };
    const res = await orchestrator.run(req);
    rows.push({
      caseId: c.caseId,
      photoLabel: c.photoLabel,
      operationKinds: c.operations.map((o) => o.kind),
      provider: res.providerUsed ?? "(none)",
      ok: res.ok,
      attemptsCount: res.attempts.length,
      totalLatencyMs: res.totalLatencyMs,
      totalInternalCostUsd: res.totalInternalCostUsd,
      failureReason: res.failureReason,
      outputImage: res.outputImage,
    });
  }

  fs.mkdirSync(outDir, { recursive: true });
  // 1) сырой JSON
  fs.writeFileSync(path.join(outDir, "bakeoff_results.json"), JSON.stringify(rows, null, 2));
  // 2) CSV сводка по стоимости/латентности
  writeCsv(rows, path.join(outDir, "bakeoff_results.csv"));
  // 3) пустой scoring-шаблон для ручной оценки качества
  writeScoringTemplate(rows, path.join(outDir, "bakeoff_scoring_template.json"));
  fs.writeFileSync(path.join(outDir, "bakeoff_run_manifest.json"), JSON.stringify({
    mode: safety.allowPaidProviders ? "paid-enabled" : "mock-only",
    ...spendGuard.snapshot(),
    casesRequested: cases.length,
    casesCompleted: rows.filter((row) => row.ok).length,
  }, null, 2));

  printCostSummary(rows);
  return rows;
}

function writeCsv(rows: BakeoffRow[], file: string) {
  const header = [
    "caseId", "photoLabel", "operations", "provider",
    "ok", "attempts", "latencyMs", "internalCostUsd", "failureReason",
  ].join(",");
  const body = rows
    .map((r) =>
      [
        r.caseId,
        `"${r.photoLabel}"`,
        `"${r.operationKinds.join("+")}"`,
        r.provider,
        r.ok,
        r.attemptsCount,
        r.totalLatencyMs,
        r.totalInternalCostUsd,
        r.failureReason ?? "",
      ].join(",")
    )
    .join("\n");
  fs.writeFileSync(file, `${header}\n${body}\n`);
}

/** Готовит JSON, который человек заполняет баллами 1..5 по каждому критерию. */
function writeScoringTemplate(rows: BakeoffRow[], file: string) {
  const template = rows
    .filter((r) => r.ok) // оцениваем только успешные рендеры
    .map((r) => ({
      caseId: r.caseId,
      provider: r.provider,
      operationKinds: r.operationKinds,
      scores: Object.fromEntries(RUBRIC_CRITERIA.map((c) => [c, null])) as RubricScore,
    }));
  fs.writeFileSync(file, JSON.stringify(template, null, 2));
}

/** Сводка по стоимости — это часть Slice 0 go/no-go по деньгам. */
function printCostSummary(rows: BakeoffRow[]) {
  const byProvider = new Map<string, { n: number; ok: number; cost: number; latency: number }>();
  for (const r of rows) {
    const key = r.provider;
    const acc = byProvider.get(key) ?? { n: 0, ok: 0, cost: 0, latency: 0 };
    acc.n += 1;
    acc.ok += r.ok ? 1 : 0;
    acc.cost += r.totalInternalCostUsd;
    acc.latency += r.totalLatencyMs;
    byProvider.set(key, acc);
  }
  console.log("\n=== BAKE-OFF COST SUMMARY ===");
  for (const [provider, a] of byProvider) {
    const costPerSuccess = a.ok > 0 ? a.cost / a.ok : NaN;
    console.log(
      `${provider}: cases=${a.n} ok=${a.ok} ` +
      `avgLatency=${Math.round(a.latency / a.n)}ms ` +
      `totalCost=$${a.cost.toFixed(3)} ` +
      `costPerSuccess=$${isNaN(costPerSuccess) ? "n/a" : costPerSuccess.toFixed(3)}`
    );
  }
  console.log("Помни: главный порог — cost per SUCCESSFUL render (с учётом ретраев), не за вызов.");
}

// --- Оценка качества после ручного заполнения scoring-шаблона ---

export function summarizeQuality(scoredFile: string) {
  const scored: { operationKinds: OperationKind[]; scores: RubricScore }[] =
    JSON.parse(fs.readFileSync(scoredFile, "utf-8"));

  const byOp = new Map<OperationKind, { total: number; accepted: number }>();
  for (const item of scored) {
    for (const op of item.operationKinds) {
      const acc = byOp.get(op) ?? { total: 0, accepted: 0 };
      acc.total += 1;
      acc.accepted += isAccepted(item.scores) ? 1 : 0;
      byOp.set(op, acc);
    }
  }

  console.log("\n=== QUALITY GO / NO-GO (порог ", PASS_RATE * 100, "%) ===");
  for (const [op, a] of byOp) {
    const rate = a.total > 0 ? a.accepted / a.total : 0;
    const verdict = rate >= PASS_RATE ? "PASS ✅" : "NO-GO ❌";
    console.log(`${op}: accepted ${a.accepted}/${a.total} = ${(rate * 100).toFixed(0)}%  ${verdict}`);
  }
}

// --- Пример запуска с mock-провайдерами (без сети). ---
// Замени mock на реальные адаптеры и передай реальные фото/операции для настоящего bake-off.
if (require.main === module) {
  const registry = new ProviderRegistry({ primary: "mockA", fallback: "mockB" })
    .register(new MockAIProvider({ name: "mockA", failureRate: 0.2, costUsd: 0.04 }))
    .register(new MockAIProvider({ name: "mockB", failureRate: 0.0, costUsd: 0.06 }));

  const demoCases: BakeoffCase[] = [
    {
      caseId: "demo01_wrap",
      photoLabel: "demo car",
      sourceImage: "demo://car.jpg",
      operations: [{ kind: "wrap", finish: "satin", colorName: "Racing Green", colorHex: "#3E5B44" }],
    },
    {
      caseId: "demo02_wheels",
      photoLabel: "demo car",
      sourceImage: "demo://car.jpg",
      operations: [
        {
          kind: "wheel_replace",
          wheelVariantId: "bmw-437m-r20-ferric",
          label: "BMW Style 437M · R20 · Ferric Grey",
          referenceImageUrls: ["demo://437m.png"],
        },
      ],
    },
  ];

  runBakeoff(demoCases, registry, path.join(__dirname, "../../out"), {
    maxBudgetUsd: 2,
    allowPaidProviders: false,
  }).then(() => {
    console.log("\nDemo bake-off done. Заполни out/bakeoff_scoring_template.json и вызови summarizeQuality().");
  });
}
