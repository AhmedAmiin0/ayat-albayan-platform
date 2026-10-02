// Entry point: node --env-file-if-exists=.env src/cli.ts <command> (see cli.args.ts USAGE).
// Prints counts and file paths only — never row contents.
import { outPath, readJson } from './cache.ts';
import { type CliArgs, parseCli } from './cli.args.ts';
import { planOrApply, validate } from './cli.commands.ts';
import type { ReviewPlan } from './report/review.ts';
import { writeReview } from './report/review.ts';
import { crmReaderFromEnv } from './sources/crm.ts';
import { extractCrm } from './sources/extract-crm.ts';
import { extractSheets } from './sources/extract-sheets.ts';

async function main(args: CliArgs): Promise<void> {
  switch (args.command) {
    case 'extract-sheets': {
      const m = await extractSheets({ zip: args.zip });
      console.log(
        `extracted ${Object.values(m.rows).reduce((a, b) => a + b, 0)} rows from ${m.zip}`,
        m.rows,
      );
      return;
    }
    case 'extract-crm':
      console.log(
        'CRM rows',
        await extractCrm({ reader: crmReaderFromEnv(process.env), since: args.since }),
      );
      return;
    case 'dry-run':
      return planOrApply(args, false);
    case 'apply':
      return planOrApply(args, true);
    case 'validate':
      return validate(args);
    case 'review': {
      const plan = readJson<ReviewPlan | undefined>(outPath.plan(), undefined);
      if (!plan) throw new Error('No out/plan.json: run dry-run first');
      await writeReview(plan, outPath.review());
      console.log(`review → ${outPath.review()}`);
    }
  }
}

Promise.resolve()
  .then(() => main(parseCli(process.argv.slice(2))))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
