// docs/32 g1 + c-rows: a domain move PR adds its domain to the app's `const DOMAINS = [...]`
// in eslint.config.js (packages/config/eslint-domains.js). The pure-move gate accepts that one
// line when every added domain is the target folder (`<app>/src/<domain>/`) of a rename in the
// same diff and no domain is dropped.
import { posix } from 'node:path';

const LINE = /^const DOMAINS = \[([^\]\n]*)\];$/m;
const namesOf = (text) => [...(LINE.exec(text)?.[1] ?? '').matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
const movedInto = (root, renames) => (d) => renames.some(([, to]) => to.startsWith(`${root}src/${d}/`));

/**
 * The head text of an eslint config with its DOMAINS line put back to the base's when the change
 * only adds domains this diff moves files into; otherwise the head text unchanged (the normal
 * check then fails it).
 */
export function followDomains(base, head, { file, renames }) {
  const [before, after] = [LINE.exec(base), LINE.exec(head)];
  if (!before || !after || before[0] === after[0]) return head;
  const root = posix.dirname(file) === '.' ? '' : `${posix.dirname(file)}/`;
  const [old, now] = [namesOf(base), namesOf(head)];
  const added = now.filter((d) => !old.includes(d));
  const kept = old.every((d) => now.includes(d));
  const ok = kept && added.length > 0 && added.every(movedInto(root, renames));
  return ok ? head.replace(LINE, before[0]) : head;
}
