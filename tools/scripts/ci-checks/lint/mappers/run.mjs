// guard:mappers: every `to*` mapper a branch adds in apps/api returns its package type through
// asResponse (docs/62 part 2 §4). Diff-scoped, so it needs no baseline.
import { baseCommit, changes, gitIn, readAt } from '../comment-only/git.mjs';
import { mapperFindings } from './check.mjs';
import { addedLines, isMapperPath } from './hunks.mjs';

const TAG = 'guard:mappers:';

const changedMappers = (git, base) =>
  changes(git, base)
    .filter((e) => !e.status.startsWith('D') && isMapperPath(e.path))
    .map((e) => e.path);

const findingsOf = (git, base, file) =>
  mapperFindings({
    text: readAt(git, 'HEAD', file),
    file,
    added: addedLines(git('diff', '-U0', '--no-ext-diff', base, 'HEAD', '--', file)),
  });

/** Runs the gate; returns the exit code. */
export function gate({ env, cwd, log }) {
  const git = gitIn(cwd);
  const base = baseCommit(git, env.GUARD_BASE);
  const files = changedMappers(git, base);
  const found = files.flatMap((file) => findingsOf(git, base, file));
  found.forEach((f) => log(`${TAG} ${f}`));
  log(`${TAG} ${files.length} changed mappers against ${base.slice(0, 12)}: ${found.length} failing.`);
  return found.length === 0 ? 0 : 1;
}
