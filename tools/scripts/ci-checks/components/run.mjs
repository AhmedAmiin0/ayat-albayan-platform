// guard:components (docs/63 §3), no stored file. On a PR a component that fails a rule-16 check
// fails when it is new or its base version passed, and any offender in a STRICT workspace fails.
// On develop it prints the offender counts. `--whole <ws>` lists a workspace's every offender.
import { z } from 'zod';
import { pairRenames } from '../../units/move-only/pairs.mjs';
import { baseCommit, changes, gitIn, readAt } from '../comment-only/git.mjs';
import { mover } from '../lint/baselines/renames.mjs';
import { componentReports } from './check.mjs';
import { STRICT } from './scope.mjs';
import { gitTree, headTree } from './tree.mjs';

const TAG = 'guard:components:';

const flags = z.union([
  z.tuple([]),
  z.tuple([z.literal('--whole'), z.string().min(1)]),
  z.tuple([z.literal('--branch'), z.string()]),
]);
const env = z.object({ GUARD_BASE: z.string().optional() });

const offenders = (reports) => [...reports.values()].filter((r) => r.failures.length > 0);

const counts = (list, keyOf) =>
  [...Map.groupBy(list, keyOf)].map(([k, rows]) => `${k} ${rows.length}`).join(', ');

const printAll = (list, log) =>
  list.forEach((r) =>
    r.failures.forEach((f) => log(`${TAG} ${r.key}: check ${f.check}: ${f.why}`)),
  );

function wholeGate(reports, ws, log) {
  const mine = offenders(reports).filter((r) => r.ws === ws || r.ws?.endsWith(`/${ws}`));
  printAll(mine, log);
  const checks = counts(
    mine.flatMap((r) => r.failures),
    (f) => `check ${f.check}`,
  );
  log(`${TAG} ${ws}: ${mine.length} offenders${mine.length === 0 ? '' : ` (${checks})`}.`);
  return mine.length === 0 ? 0 : 1;
}

function headToBase({ git, base, baseReports, headPaths }) {
  const read = (rev) => (path) => readAt(git, rev, path);
  const entries = pairRenames(changes(git, base), read(base), read('HEAD'));
  const renames = entries.filter((e) => e.from !== undefined).map((e) => [e.from, e.path]);
  const dirs = new Set(
    headPaths.flatMap((p) => p.split('/').map((_, i, a) => a.slice(0, i).join('/'))),
  );
  const move = mover(renames, (dir) => !dirs.has(dir));
  return new Map([...baseReports.values()].map((r) => [move(r.path), r.path]));
}

const blocks = (r, at) => {
  const was = at.baseReports.get(`${at.toBase.get(r.path) ?? r.path}::${r.name}`);
  return at.strict.includes(r.ws) || was === undefined || was.failures.length === 0;
};

function prGate({ git, cwd, base, tree, strict, log }) {
  const head = componentReports(tree);
  const baseReports = componentReports(gitTree(cwd, base));
  const headPaths = tree.paths;
  const toBase = headToBase({ git, base, baseReports, headPaths });
  const failing = offenders(head).filter((r) => blocks(r, { baseReports, toBase, strict }));
  printAll(failing, log);
  const verdict =
    failing.length === 0 ? 'no new or regressed component' : `${failing.length} failing`;
  log(`${TAG} against ${base.slice(0, 12)}: ${verdict}.`);
  return failing.length === 0 ? 0 : 1;
}

/** Runs the guard; returns the exit code. `strict` defaults to scope.mjs STRICT. */
export function gate({ argv, env: environment, cwd, log, strict = STRICT }) {
  const [flag, value] = flags.parse(argv.filter((a) => a !== '--'));
  const tree = headTree(cwd);
  if (flag === '--whole') return wholeGate(componentReports(tree), value, log);
  const git = gitIn(cwd);
  const base = baseCommit(git, env.parse(environment).GUARD_BASE);
  if (base === git('rev-parse', 'HEAD').trim()) {
    const list = offenders(componentReports(tree));
    log(`::notice::${TAG} ${list.length} offenders (${counts(list, (r) => r.ws)}).`);
    return 0;
  }
  return prGate({ git, cwd, base, tree, strict, log });
}
