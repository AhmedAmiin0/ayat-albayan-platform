// guard:comments: on a `chore/comments-*` branch, every change must be a comment removal or edit.
import { isCommentBranch, parseArgs } from './args.mjs';
import { compareFile } from './compare.mjs';
import { fileFailures } from './files.mjs';
import { baseCommit, changes, gitIn, readAt } from './git.mjs';
import { CODE } from './patterns.mjs';

const TAG = 'guard:comments:';

function failuresOf(git, base) {
  const entries = changes(git, base);
  const code = entries.filter((e) => fileFailures([e]).length === 0 && CODE.test(e.path));
  const shapes = code.map(({ path }) => {
    const found = compareFile({
      file: path,
      base: readAt(git, base, path),
      head: readAt(git, 'HEAD', path),
    });
    return found === null ? null : `${path}: ${found}`;
  });
  return [...fileFailures(entries), ...shapes.filter((f) => f !== null)];
}

/** Runs the gate; returns the exit code. */
export function gate({ argv, env, cwd, log }) {
  const { branch, guardBase } = parseArgs(argv, env);
  if (!isCommentBranch(branch)) {
    const name = branch || '(no branch)';
    log(`::notice::${TAG} ${name} is not a chore/comments-* branch, comment proof skipped.`);
    return 0;
  }
  const git = gitIn(cwd);
  const base = baseCommit(git, guardBase);
  const failures = failuresOf(git, base);
  failures.forEach((f) => log(`${TAG} ${f}`));
  const verdict = failures.length === 0 ? 'only comments changed' : `${failures.length} failing`;
  log(`${TAG} ${branch} against ${base.slice(0, 12)}: ${verdict}.`);
  return failures.length === 0 ? 0 : 1;
}
