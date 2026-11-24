// `node tools/scripts/ci-checks/lint/loosened/run.mjs`: on a PR (GUARD_BASE), one «lint rules
// loosened» annotation per way the head's lint config is looser than the base's. It never fails:
// like a widened layer table, such a PR merges only with the owner's go (docs/59).
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loosened } from './rules.mjs';
import { configText } from './sources.mjs';

const TITLE = 'lint rules loosened';

/** The annotation lines for `found` (GitHub Actions workflow commands). */
export const annotations = (found) => found.map((line) => `::warning title=${TITLE}::${line}`);

function main() {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const baseDir = process.env.GUARD_BASE;
  if (!baseDir) return console.log('lint config: no base branch given (GUARD_BASE)');
  const rev = execFileSync('git', ['-C', baseDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const found = loosened({ base: configText(root, rev), head: configText(root, 'HEAD') });
  console.log(`lint config: ${found.length} loosened against the base branch`);
  for (const line of annotations(found)) console.log(line);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
