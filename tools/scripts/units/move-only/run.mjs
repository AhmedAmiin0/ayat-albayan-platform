// guard:move-only: on a `move/*` branch every change is a move (CLAUDE.md rule 13 lanes): pure
// renames, path strings that follow them, export-only index.ts files and baselines whose paths
// follow their files. Fail-closed: any other change, or an error, fails the gate.
import { parseArgs } from '../../ci-checks/comment-only/args.mjs';
import { baseCommit, changes, gitIn } from '../../ci-checks/comment-only/git.mjs';
import { moveFailures } from './entries.mjs';

const TAG = 'guard:move-only:';
const BRANCH = /^move\//;

/** Runs the gate; returns the exit code. */
export function gate({ argv, env, cwd, log }) {
  const { branch, guardBase } = parseArgs(argv, env);
  if (!BRANCH.test(branch)) {
    log(`::notice::${TAG} ${branch || '(no branch)'} is not a move/* branch, move proof skipped.`);
    return 0;
  }
  const git = gitIn(cwd);
  const base = baseCommit(git, guardBase);
  const failures = moveFailures({ git, base, entries: changes(git, base) });
  failures.forEach((f) => log(`${TAG} ${f}`));
  const verdict = failures.length === 0 ? 'only moves' : `${failures.length} failing`;
  log(`${TAG} ${branch} against ${base.slice(0, 12)}: ${verdict}.`);
  return failures.length === 0 ? 0 : 1;
}
