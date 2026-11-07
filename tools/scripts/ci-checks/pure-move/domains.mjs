// docs/32 g1 + c-rows: a domain move PR adds its domain to the app's `const DOMAINS = [...]`
// in its lint.blocks.mjs (eslint.config.js before docs/31b; packages/config/eslint-domains.js).
// The pure-move gate accepts that one line, written as plain quoted names, when every added domain
// regroups files into `<app>/src/<domain>/<module>/` from outside that module in the same diff and
// no domain is dropped.
import { posix } from 'node:path';

const ESLINT = /(^|\/)(eslint\.config\.[cm]?js|lint\.blocks\.mjs)$/;
const LINE = /^const DOMAINS = \[([^\]\n]*)\];$/m;
const namesOf = (text) => [...(LINE.exec(text)?.[1] ?? '').matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
const canonical = (names) => `const DOMAINS = [${names.map((d) => `'${d}'`).join(', ')}];`;
const moduleOf = (dir, file) =>
  file.startsWith(dir) ? /^([^/]+)\/./.exec(file.slice(dir.length))?.[1] : undefined;
/** A rename into `src/<d>/<module>/` from anywhere but that same module folder. */
const regroups = (root, renames) => (d) => {
  const dir = `${root}src/${d}/`;
  const into = ([from, to]) => {
    const mod = moduleOf(dir, to);
    return mod !== undefined && mod !== moduleOf(dir, from);
  };
  return renames.some(into);
};

/**
 * The head text of an eslint config with its DOMAINS line put back to the base's when the change
 * only adds domains this diff regroups; otherwise the head text unchanged (the normal check then
 * fails it).
 */
export function followDomains(base, head, { file, renames }) {
  const [before, after] = [LINE.exec(base), LINE.exec(head)];
  if (!ESLINT.test(file) || !before || !after || before[0] === after[0]) return head;
  const root = posix.dirname(file) === '.' ? '' : `${posix.dirname(file)}/`;
  const [old, now] = [namesOf(base), namesOf(head)];
  const added = now.filter((d) => !old.includes(d));
  const kept = old.every((d) => now.includes(d)) && after[0] === canonical(now);
  const ok = kept && added.length > 0 && added.every(regroups(root, renames));
  return ok ? head.replace(LINE, before[0]) : head;
}
