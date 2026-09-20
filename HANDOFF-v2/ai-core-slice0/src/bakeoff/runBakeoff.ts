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
import { persistOutputArtifact } from "./artifacts";
import {
  criteriaForOperations,
  RubricScore,
  isAccepted,
  meanScore,
  PASS_RATE,
  scoreErrors,
} from "./rubric";

// --- Вход: набор тестовых фото и операций к каждому ---

export interface BakeoffCase {
  caseId: string; // напр. "photo01_wrap_green"
  photoLabel: string; // "BMW M4 front 3/4"
  sourceImage: string; // url/base64
  operations: OperationConfig[];
}

export interface BakeoffCandidate {
  /** Название сравниваемой конфигурации, например gemini-pro или gemini-flash. */
  label: string;
  registry: ProviderRegistry;
  retriesSameProvider?: number;
}

export interface BakeoffRow {
  renderId: string;
  caseId: string;
  photoLabel: string;
  sourceImage: string;
  operationKinds: OperationKind[];
  candidate: string;
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
  candidates: BakeoffCandidate[],
  outDir: string,
  safety: BakeoffSafetyOptions
): Promise<BakeoffRow[]> {
  // Одного boolean недостаточно: для платного запуска оператор должен ещё
  // выставить одноразовое подтверждение в окружении именно этой команды.
  if (safety.allowPaidProviders && process.env.PROJECT_DRIVE_ALLOW_PAID_AI !== "YES_FOR_THIS_RUN") {
    throw new Error("Paid AI is locked. Set PROJECT_DRIVE_ALLOW_PAID_AI=YES_FOR_THIS_RUN only after explicit approval.");
  }
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error("Bake-off needs at least one candidate");
  const labels = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.label.trim()) throw new Error("Bake-off candidate label is required");
    if (labels.has(candidate.label)) throw new Error(`Duplicate bake-off candidate: ${candidate.label}`);
    labels.add(candidate.label);
  }
  const spendGuard = new SpendGuard(safety);
  const runners = candidates.map((candidate) => ({
    candidate,
    orchestrator: new GenerationOrchestrator(candidate.registry, {
      retriesSameProvider: candidate.retriesSameProvider ?? 1,
      spendGuard,
    }),
  }));
  const rows: BakeoffRow[] = [];
  fs.mkdirSync(outDir, { recursive: true });

  for (const c of cases) {
    for (const { candidate, orchestrator } of runners) {
      const req: GenerationRequest = {
        sourceImage: c.sourceImage,
        operations: c.operations,
      };
      const res = await orchestrator.run(req);
      const renderId = `render-${String(rows.length + 1).padStart(4, "0")}`;
      const outputImage = res.ok && res.outputImage
        ? await persistOutputArtifact(res.outputImage, outDir, renderId)
        : undefined;
      rows.push({
        renderId,
        caseId: c.caseId,
        photoLabel: c.photoLabel,
        sourceImage: c.sourceImage,
        operationKinds: c.operations.map((o) => o.kind),
        candidate: candidate.label,
        provider: res.providerUsed ?? "(none)",
        ok: res.ok,
        attemptsCount: res.attempts.length,
        totalLatencyMs: res.totalLatencyMs,
        totalInternalCostUsd: res.totalInternalCostUsd,
        failureReason: res.failureReason,
        outputImage,
      });
    }
  }

  // 1) сырой JSON
  fs.writeFileSync(path.join(outDir, "bakeoff_results.json"), JSON.stringify(rows, null, 2));
  // 2) CSV сводка по стоимости/латентности
  writeCsv(rows, path.join(outDir, "bakeoff_results.csv"));
  // 3) пустой scoring-шаблон для ручной оценки качества
  writeScoringTemplate(rows, path.join(outDir, "bakeoff_scoring_template.json"));
  // 4) имя кандидата скрыто от оценщика и раскрывается отдельным ключом.
  writeBlindKey(rows, path.join(outDir, "bakeoff_blind_key.json"));
  fs.writeFileSync(path.join(outDir, "bakeoff_run_manifest.json"), JSON.stringify({
    mode: safety.allowPaidProviders ? "paid-enabled" : "mock-only",
    ...spendGuard.snapshot(),
    casesRequested: cases.length,
    candidates: candidates.map((candidate) => candidate.label),
    renderRequests: cases.length * candidates.length,
    successfulRenders: rows.filter((row) => row.ok).length,
  }, null, 2));

  printCostSummary(rows);
  return rows;
}

function writeCsv(rows: BakeoffRow[], file: string) {
  const header = [
    "renderId", "caseId", "photoLabel", "operations", "candidate", "provider",
    "ok", "attempts", "latencyMs", "internalCostUsd", "failureReason",
  ].join(",");
  const body = rows
    .map((r) =>
      [
        r.renderId,
        r.caseId,
        `"${r.photoLabel}"`,
        `"${r.operationKinds.join("+")}"`,
        r.candidate,
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
      renderId: r.renderId,
      caseId: r.caseId,
      operationKinds: r.operationKinds,
      sourceImage: r.sourceImage,
      outputImage: r.outputImage,
      scores: Object.fromEntries(criteriaForOperations(r.operationKinds).map((c) => [c, null])) as RubricScore,
      note: "",
    }));
  fs.writeFileSync(file, JSON.stringify(template, null, 2));
}

function writeBlindKey(rows: BakeoffRow[], file: string) {
  const key = rows.map((row) => ({
    renderId: row.renderId,
    caseId: row.caseId,
    candidate: row.candidate,
    provider: row.provider,
  }));
  fs.writeFileSync(file, JSON.stringify(key, null, 2));
}

/** Сводка по стоимости — это часть Slice 0 go/no-go по деньгам. */
function printCostSummary(rows: BakeoffRow[]) {
  const byProvider = new Map<string, { n: number; ok: number; cost: number; latency: number }>();
  for (const r of rows) {
    const key = `${r.candidate} -> ${r.provider}`;
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

export interface QualityGroupSummary {
  total: number;
  accepted: number;
  acceptanceRate: number;
  meanScore: number;
  verdict: "PASS" | "NO-GO";
}

export interface QualitySummary {
  byOperation: Record<string, QualityGroupSummary>;
  byCandidate: Record<string, QualityGroupSummary>;
  byCandidateOperation: Record<string, Record<string, QualityGroupSummary>>;
}

export function summarizeQuality(scoredFile: string, blindKeyFile?: string): QualitySummary {
  const scored: { renderId: string; operationKinds: OperationKind[]; scores: RubricScore }[] =
    JSON.parse(fs.readFileSync(scoredFile, "utf-8"));
  if (!Array.isArray(scored) || scored.length === 0) throw new Error("Scoring file has no renders");

  const blindRows: { renderId: string; candidate: string }[] = blindKeyFile
    ? JSON.parse(fs.readFileSync(blindKeyFile, "utf-8"))
    : [];
  const candidateByRender = new Map(blindRows.map((row) => [row.renderId, row.candidate]));
  const seen = new Set<string>();

  const byOp = new Map<OperationKind, QualityAccumulator>();
  const byCandidate = new Map<string, QualityAccumulator>();
  const byCandidateOperation = new Map<string, QualityAccumulator>();
  for (const item of scored) {
    if (!item.renderId || seen.has(item.renderId)) throw new Error(`Missing or duplicate renderId: ${item.renderId || "(empty)"}`);
    seen.add(item.renderId);
    const errors = scoreErrors(item.scores, item.operationKinds);
    if (errors.length) throw new Error(`${item.renderId}: ${errors.join("; ")}`);
    const accepted = isAccepted(item.scores, item.operationKinds);
    const score = meanScore(item.scores, item.operationKinds);
    for (const op of item.operationKinds) {
      addQualityResult(byOp, op, accepted, score);
    }
    if (blindKeyFile) {
      const candidate = candidateByRender.get(item.renderId);
      if (!candidate) throw new Error(`${item.renderId}: missing from blind key`);
      addQualityResult(byCandidate, candidate, accepted, score);
      for (const op of item.operationKinds) addQualityResult(byCandidateOperation, `${candidate}\u0000${op}`, accepted, score);
    }
  }

  console.log("\n=== QUALITY GO / NO-GO (порог ", PASS_RATE * 100, "%) ===");
  const operationSummary = finalizeQuality(byOp);
  const candidateSummary = finalizeQuality(byCandidate);
  const candidateOperationSummary: Record<string, Record<string, QualityGroupSummary>> = {};
  for (const [joinedKey, result] of Object.entries(finalizeQuality(byCandidateOperation))) {
    const [candidate, operation] = joinedKey.split("\u0000");
    candidateOperationSummary[candidate] ??= {};
    candidateOperationSummary[candidate][operation] = result;
  }
  for (const [op, result] of Object.entries(operationSummary)) {
    console.log(`${op}: accepted ${result.accepted}/${result.total} = ${(result.acceptanceRate * 100).toFixed(0)}%  ${result.verdict}`);
  }
  for (const [candidate, result] of Object.entries(candidateSummary)) {
    console.log(`${candidate}: accepted ${result.accepted}/${result.total}, mean=${result.meanScore.toFixed(2)}  ${result.verdict}`);
  }
  for (const [candidate, operations] of Object.entries(candidateOperationSummary)) {
    for (const [operation, result] of Object.entries(operations)) {
      console.log(`${candidate} / ${operation}: ${(result.acceptanceRate * 100).toFixed(0)}%  ${result.verdict}`);
    }
  }
  return {
    byOperation: operationSummary,
    byCandidate: candidateSummary,
    byCandidateOperation: candidateOperationSummary,
  };
}

interface QualityAccumulator { total: number; accepted: number; scoreTotal: number }

function addQualityResult(map: Map<string, QualityAccumulator>, key: string, accepted: boolean, score: number) {
  const current = map.get(key) ?? { total: 0, accepted: 0, scoreTotal: 0 };
  current.total += 1;
  current.accepted += accepted ? 1 : 0;
  current.scoreTotal += score;
  map.set(key, current);
}

function finalizeQuality(map: Map<string, QualityAccumulator>): Record<string, QualityGroupSummary> {
  return Object.fromEntries([...map.entries()].map(([key, value]) => {
    const acceptanceRate = value.total ? value.accepted / value.total : 0;
    return [key, {
      total: value.total,
      accepted: value.accepted,
      acceptanceRate,
      meanScore: value.total ? value.scoreTotal / value.total : 0,
      verdict: acceptanceRate >= PASS_RATE ? "PASS" : "NO-GO",
    } satisfies QualityGroupSummary];
  }));
}

// --- Пример запуска с mock-провайдерами (без сети). ---
// Замени mock на реальные адаптеры и передай реальные фото/операции для настоящего bake-off.
if (require.main === module) {
  const candidates: BakeoffCandidate[] = [
    {
      label: "mock-a",
      registry: new ProviderRegistry({ primary: "mockA" })
        .register(new MockAIProvider({ name: "mockA", failureRate: 0.2, costUsd: 0.04 })),
    },
    {
      label: "mock-b",
      registry: new ProviderRegistry({ primary: "mockB" })
        .register(new MockAIProvider({ name: "mockB", failureRate: 0.0, costUsd: 0.06 })),
    },
  ];

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

  runBakeoff(demoCases, candidates, path.join(__dirname, "../../out"), {
    maxBudgetUsd: 2,
    allowPaidProviders: false,
  }).then(() => {
    console.log("\nDemo bake-off done. Заполни out/bakeoff_scoring_template.json и вызови summarizeQuality().");
  });
}
