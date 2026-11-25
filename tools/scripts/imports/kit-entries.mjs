// The kit entries codemod (docs/64 PR 5): app imports of kit paths that are no longer public
// move to the kit's entries (kit-entries/table.mjs). Deterministic: a second run finds nothing.
// Usage: pnpm imports:kit-entries [--write]   (dry run without --write)
import { fileURLToPath, pathToFileURL } from 'node:url';
import { run } from './kit-entries/run.mjs';
import { KIT_TABLE } from './kit-entries/table.mjs';

function main(args) {
  const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/');
  const write = args.includes('--write');
  const report = run(root, { write, table: KIT_TABLE });
  console.log(write ? 'kit entries (written):' : 'kit entries (dry run, nothing written):');
  console.log(`  ${report.rewritten} statements in ${report.changed.length} files`);
  for (const line of report.manual) console.log(`  manual: ${line}`);
  process.exitCode = report.manual.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
