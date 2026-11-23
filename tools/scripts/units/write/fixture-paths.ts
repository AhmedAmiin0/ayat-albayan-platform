import { posix } from 'node:path';
import { Node, type SourceFile } from 'ts-morph';
import type { Edit } from './write.types.ts';

interface PathCtx {
  /** The reader's path today and once moved. */
  file: string;
  to: string;
  renamed: ReadonlyMap<string, string>;
}

interface Found {
  literals: Node[];
}

const DIRNAMES = new Set(['__dirname', 'import.meta.dirname']);
const JOINS = /(?:^|\.)(?:join|resolve)$/;

const isText = (n: Node): boolean => Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n);

const textOf = (n: Node): string =>
  Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n) ? n.getLiteralValue() : '';

/** `new URL('<path>', import.meta.url)` */
function urlPath(n: Node): Found | undefined {
  if (!Node.isNewExpression(n) || n.getExpression().getText() !== 'URL') return undefined;
  const [path, base] = n.getArguments();
  const ok = path !== undefined && isText(path) && base?.getText() === 'import.meta.url';
  return ok ? { literals: [path] } : undefined;
}

/** `join(__dirname, 'a', 'b')`, `path.resolve(import.meta.dirname, 'a')` */
function joinPath(n: Node): Found | undefined {
  if (!Node.isCallExpression(n) || !JOINS.test(n.getExpression().getText())) return undefined;
  const [dir, ...rest] = n.getArguments();
  const ok = dir !== undefined && DIRNAMES.has(dir.getText()) && rest.length > 0 && rest.every(isText);
  return ok ? { literals: rest } : undefined;
}

const dotted = (rel: string): string => (rel.startsWith('.') ? rel : `./${rel}`);

/** One edit: the first literal takes the whole new path when it is one literal or the target moved. */
function editOf(found: Found, ctx: PathCtx): Edit | undefined {
  const [first] = found.literals;
  if (first === undefined) return undefined;
  const [from, to] = [posix.dirname(ctx.file), posix.dirname(ctx.to)];
  const target = posix.join(from, ...found.literals.map(textOf));
  const moved = ctx.renamed.get(target);
  if (moved === undefined && from === to) return undefined;
  const whole = found.literals.length === 1 || moved !== undefined;
  const rel = whole
    ? posix.relative(to, moved ?? target)
    : posix.join(posix.relative(to, from), textOf(first));
  const value = textOf(first).startsWith('./') || first === found.literals.at(-1) ? dotted(rel) : rel;
  return { start: first.getStart() + 1, end: first.getEnd() - 1, value };
}

/** Edits so the file's own-folder paths (URL and dirname joins) still reach their files. */
export function fixtureEdits(sf: SourceFile, ctx: PathCtx): Edit[] {
  const out: Edit[] = [];
  sf.forEachDescendant((n) => {
    const found = urlPath(n) ?? joinPath(n);
    const edit = found === undefined ? undefined : editOf(found, ctx);
    if (edit !== undefined) out.push(edit);
  });
  return out;
}
