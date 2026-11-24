// Lints code with the real Oxlint binary and flat-config blocks converted as the composed config
// converts them (convert.js), with the `ab` plugin registered: the config tests' linter.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { toOverrides } from '../convert.js';

const require = createRequire(import.meta.url);
const BIN = join(dirname(require.resolve('oxlint/package.json')), 'bin/oxlint');
const AB = new URL('../ab-plugin.js', import.meta.url).pathname;
const PKG = 'pkg';

/** `eslint(no-console)` → `no-console`, `ab(no-if-chains)` → `ab/no-if-chains`. */
function ruleOf(code) {
  const [, plugin, rule] = /^([\w-]+)\((.+)\)$/.exec(code) ?? [];
  return plugin === 'eslint' ? rule : `${plugin}/${rule}`;
}

/** The same `code` under every path of `paths`, as `lintCode`'s `files`. */
export const withCode = (paths, code) => Object.fromEntries(paths.map((path) => [path, code]));

function writeFiles(root, files) {
  for (const [path, code] of Object.entries(files)) {
    const at = join(root, PKG, path);
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, code);
  }
}

/**
 * `files` (`{ path: code }`, package-relative) linted with `blocks`, or `blocksFor(packageDir)`
 * for a rule that needs the absolute folder; one `{ file, rule, message }` per finding.
 */
export function lintCode({ blocks = [], blocksFor, files }) {
  const root = mkdtempSync(join(tmpdir(), 'ab-oxlint-'));
  try {
    writeFiles(root, files);
    const config = {
      plugins: ['typescript', 'react', 'jsx-a11y'],
      jsPlugins: [{ name: 'ab', specifier: AB }],
      categories: { correctness: 'off' },
      ...toOverrides(PKG, blocksFor ? blocksFor(join(root, PKG)) : blocks),
    };
    writeFileSync(join(root, '.oxlintrc.json'), JSON.stringify(config));
    const args = ['-c', '.oxlintrc.json', '--format', 'json', PKG];
    const run = spawnSync(BIN, args, { cwd: root, encoding: 'utf8' });
    return JSON.parse(run.stdout).diagnostics.map((d) => ({
      file: d.filename.slice(PKG.length + 1),
      rule: ruleOf(d.code),
      message: d.message,
    }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
