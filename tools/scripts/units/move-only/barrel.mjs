// The one file a move adds: a unit's index.ts that only re-exports (CLAUDE.md rule 13).
import { parse, SyntaxKind } from '../../ci-checks/comment-only/source.mjs';

const INDEX = /(?:^|\/)index\.tsx?$/;

/** `export … from '…'`, or the empty `export {}` of a unit nothing imports by name. */
const isReexport = (s) =>
  s.kind === SyntaxKind.ExportDeclaration &&
  (s.moduleSpecifier !== undefined || s.exportClause?.elements.length === 0);

/** Why the added file `path` is more than an export-only index.ts, or null. */
export function addedFailure(path, text) {
  if (!INDEX.test(path)) return 'added (a move adds only an export-only index.ts)';
  const sf = parse(text, path);
  const bad = sf.statements.find((s) => !isReexport(s));
  return bad === undefined
    ? null
    : `index.ts holds more than re-exports: ${bad.getText(sf).slice(0, 60)}`;
}
