// Git calls a small file whose every import changed a delete and an add (below -M's 50 %
// similarity). A deleted and an added code file whose text is the same once their path strings
// are emptied are one move.
import { CODE } from '../../ci-checks/comment-only/patterns.mjs';
import { maskSpecifiers } from './specifiers.mjs';

const code = (entries, status) => entries.filter((e) => e.status === status && CODE.test(e.path));

/** `entries` with each such delete + add replaced by one `R` entry (status without a score). */
export function pairRenames(entries, readBase, readHead) {
  const gone = Map.groupBy(code(entries, 'D'), (e) => maskSpecifiers(readBase(e.path), e.path));
  const pairs = code(entries, 'A').flatMap((e) => {
    const from = gone.get(maskSpecifiers(readHead(e.path), e.path))?.shift()?.path;
    return from === undefined ? [] : [{ status: 'R', path: e.path, from }];
  });
  const paired = new Set(pairs.flatMap((p) => [p.path, p.from]));
  return [...entries.filter((e) => !paired.has(e.path)), ...pairs];
}
