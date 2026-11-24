// The lint config sources of one git revision, as one text: the shared ESLint and Oxlint config,
// every package's eslint.config and lint.blocks.mjs, .oxlintrc.json, knip.json, .jscpd.json and
// the `lint:ox` script of package.json (its --ignore-pattern).
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { parseJson } from '../json-file.mjs';

const SOURCE =
  /^(packages\/config\/(oxlint\/)?[^/]+\.[cm]?js|\.oxlintrc\.json|knip\.json|\.jscpd\.json)$|(^|\/)(eslint\.config|lint\.blocks)\.[cm]?js$/;
const TEST = /\.test\./;
const rootPackage = z.object({ scripts: z.record(z.string(), z.string()) });

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1024 ** 3 });

/** The source paths among `paths`, tests left out. */
export const sourcePaths = (paths) => paths.filter((p) => SOURCE.test(p) && !TEST.test(p)).sort();

/** The text of every lint config source at `rev`, then its `lint:ox` script. */
export function configText(root, rev) {
  const paths = sourcePaths(git(root, ['ls-tree', '-r', '--name-only', rev]).split('\n'));
  const texts = paths.map((p) => git(root, ['show', `${rev}:${p}`]));
  const pkg = parseJson(git(root, ['show', `${rev}:package.json`]), rootPackage);
  return [...texts, pkg.scripts['lint:ox'] ?? ''].join('\n');
}
