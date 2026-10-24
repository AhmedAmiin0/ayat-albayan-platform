// dry-run / apply / validate against a target. Prints counts and file paths only, never rows.
import { execSync } from 'node:child_process';
import { cachePath, outPath, readJson, writeJson, writeText } from './cache.ts';
import type { CliArgs } from './cli.args.ts';
import { type TargetConfig, resolveTarget } from './config.ts';
import { createTargetStorage } from './db/storage.ts';
import { type TargetDb, createTargetDb } from './db/target.ts';
import { ENTITY_MODULES } from './entities/index.ts';
import { applyPlan } from './plan/apply.ts';
import { seedConfig } from './db/config-seed.ts';
import type { PlanWithChanges } from './plan/changes.ts';
import { buildPlan, loadBundle } from './plan/run.ts';
import { reportMarkdown } from './report/report.ts';
import { writeReview } from './report/review.ts';
import type { SheetManifest } from './sources/extract-sheets.ts';
import { openZip, resolveZipPath } from './sources/zip.ts';
import { localToday } from './time.ts';
import { checksMarkdown, checksTable, runChecks } from './validate.ts';
import { sourceChecks } from './validate.sources.ts';

function gitSha(): string | null {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const today = (): string => localToday({ now: new Date(), tz: 'Asia/Riyadh' });

async function withTarget(args: CliArgs, fn: (c: TargetConfig, db: TargetDb) => Promise<void>) {
  const config = resolveTarget({
    name: args.target,
    confirmProduction: args.confirmProduction,
    env: process.env,
  });
  const db = createTargetDb(config);
  try {
    await fn(config, db);
  } finally {
    await db.close();
  }
}

async function writeOutputs(plan: PlanWithChanges): Promise<void> {
  writeJson(outPath.plan(), plan);
  const manifest = readJson<SheetManifest | undefined>(cachePath.sheetManifest(), undefined);
  writeText(outPath.report(), reportMarkdown({ plan, manifest }));
  await writeReview(plan, outPath.review());
  const by = (a: string) => plan.items.filter((i) => i.action === a).length;
  console.log(
    `plan ${plan.target}: create ${by('create')}, update ${by('update')} (${plan.changes.length} field changes), ` +
      `adopt ${by('adopt')}, unchanged ${by('skip')}; ${plan.issues.length} issues → ${outPath.report()}, ${outPath.review()}`,
  );
}

/** dry-run never writes to the target (SELECTs only); apply writes the same plan it printed. */
export function planOrApply(args: CliArgs, apply: boolean): Promise<void> {
  return withTarget(args, async (config, db) => {
    if (apply) await db.lockApply();
    const { plan, existing } = await buildPlan({
      db,
      modules: ENTITY_MODULES,
      target: config.name,
      today: today(),
    });
    await writeOutputs(plan);
    if (!apply) return;
    const manifest = readJson<SheetManifest | undefined>(cachePath.sheetManifest(), undefined);
    const zip = plan.items.some((i) => i.key.entity === 'report_pdfs' && i.action !== 'skip')
      ? openZip(resolveZipPath(args.zip))
      : undefined;
    const runId = await applyPlan({
      db,
      plan,
      existing,
      modules: ENTITY_MODULES,
      sources: {
        zip: manifest?.zip,
        zip_sha256: manifest?.sha256,
        crm_cursor: readJson(cachePath.crmCursor(), {}),
      },
      gitSha: gitSha(),
      storage: config.storage ? createTargetStorage(config.storage) : undefined,
      readZipEntry: zip ? (path) => zip.read((n) => n === path)[path] : undefined,
    });
    console.log(`applied to ${config.name}: import_runs ${runId}`);
    console.log(`settings seed: ${await seedConfig(db)}`);
  });
}

/** docs/06 checks; exit code 1 when a hard ('zero') check fails. */
export function validate(args: CliArgs): Promise<void> {
  return withTarget(args, async (config, db) => {
    const results = [...(await runChecks(db)), ...(await sourceChecks(db, loadBundle(today())))];
    writeText(outPath.validate(), checksMarkdown(config.name, results));
    console.log(checksTable(results));
    const failing = results.filter((r) => !r.ok).length;
    console.log(`validate ${config.name}: ${failing} failing → ${outPath.validate()}`);
    if (failing) process.exitCode = 1;
  });
}
