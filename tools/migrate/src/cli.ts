// Entry point: node --env-file-if-exists=.env src/cli.ts <command> (see cli.args.ts USAGE).
// Prints counts and file paths only — never row contents.
import { outPath, readJson } from './cache.ts';
import { type CliArgs, type Command, parseCli } from './cli.args.ts';
import { planOrApply, validate } from './cli.commands.ts';
import type { ReviewPlan } from './report/review.ts';
import { writeReview } from './report/review.ts';
import { crmReaderFromEnv } from './sources/crm.ts';
import { extractCrm } from './sources/extract-crm.ts';
import { extractSheets } from './sources/extract-sheets.ts';

async function runExtractSheets(args: CliArgs): Promise<void> {
  const m = await extractSheets({ zip: args.zip });
  console.log(
    `extracted ${Object.values(m.rows).reduce((a, b) => a + b, 0)} rows from ${m.zip}`,
    m.rows,
  );
}

async function runExtractCrm(args: CliArgs): Promise<void> {
  console.log(
    'CRM rows',
    await extractCrm({ reader: crmReaderFromEnv(process.env), since: args.since }),
  );
}

async function runReview(): Promise<void> {
  const plan = readJson<ReviewPlan | undefined>(outPath.plan(), undefined);
  if (!plan) throw new Error('No out/plan.json: run dry-run first');
  await writeReview(plan, outPath.review());
  console.log(`review → ${outPath.review()}`);
}

const COMMAND_RUNNERS: Record<Command, (args: CliArgs) => Promise<void>> = {
  'extract-sheets': runExtractSheets,
  'extract-crm': runExtractCrm,
  'dry-run': (args) => planOrApply(args, false),
  apply: (args) => planOrApply(args, true),
  validate,
  review: runReview,
};

function main(args: CliArgs): Promise<void> {
  return COMMAND_RUNNERS[args.command](args);
}

Promise.resolve()
  .then(() => main(parseCli(process.argv.slice(2))))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
