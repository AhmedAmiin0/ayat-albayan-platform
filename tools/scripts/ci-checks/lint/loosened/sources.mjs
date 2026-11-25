// The lint config sources of one git revision, as one text: the shared Oxlint config
// (packages/config, its core-rules.json and rule folders), every package's lint.blocks.mjs, a
// base's .oxlintrc.json, the root oxlint.config.ts and .oxfmtrc.json, knip.json, .jscpd.json and
// the `lint:report` script of package.json.
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { parseJson } from '../json-file.mjs';

const CONFIG = String.raw`packages/config/([\w-]+/)?[^/]+\.[cm]?js|packages/config/oxlint/core-rules\.json`;
const ROOT = String.raw`\.oxlintrc\.json|oxlint\.config\.ts|\.oxfmtrc\.json|knip\.json|\.jscpd\.json`;
const SOURCE = new RegExp(String.raw`^(${CONFIG}|${ROOT})$|(^|/)lint\.blocks\.mjs$`);
const TEST = /\.test\./;
const rootPackage = z.object({ scripts: z.record(z.string(), z.string()) });

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1024 ** 3 });

/** The source paths among `paths`, tests left out. */
export const sourcePaths = (paths) => paths.filter((p) => SOURCE.test(p) && !TEST.test(p)).sort();

/** The text of every lint config source at `rev`, then its `lint:report` script. */
export function configText(root, rev) {
  const paths = sourcePaths(git(root, ['ls-tree', '-r', '--name-only', rev]).split('\n'));
  const texts = paths.map((p) => git(root, ['show', `${rev}:${p}`]));
  const pkg = parseJson(git(root, ['show', `${rev}:package.json`]), rootPackage);
  return [...texts, pkg.scripts['lint:report'] ?? ''].join('\n');
}
