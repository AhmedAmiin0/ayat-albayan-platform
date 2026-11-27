// Flags and output of the inventory; the tree reader and the log come in, so tests run it.
import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { buildReport } from './build.mjs';
import { summaryText } from './summary.mjs';

const USAGE = 'usage: pnpm shared-types:inventory [--json <file>]';
const flags = z.union([z.tuple([]), z.tuple([z.literal('--json'), z.string().min(1)])]);

/** Exit code: 0 after the summary or the JSON file, 2 for flags it does not know. */
export function runCli(argv, { log, readFiles }) {
  const parsed = flags.safeParse(argv);
  if (!parsed.success) {
    log(USAGE);
    return 2;
  }
  const report = buildReport(readFiles());
  const [, file] = parsed.data;
  const write = () => {
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
    log(`shared-types inventory: wrote ${file}`);
  };
  (file ? write : () => log(summaryText(report)))();
  return 0;
}
