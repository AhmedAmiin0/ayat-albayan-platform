import { posix } from 'node:path';
import { Node, type SourceFile } from 'ts-morph';
import type { Edit } from './write.types.ts';

interface PathCtx {
  /** The reader's path today and once moved. */
  file: string;
  to: string;
  renamed: ReadonlyMap<string, string>;
}

/** The path literals of one call: `first` takes the edit. */
interface Found {
  first: Node;
  rest: Node[];
}

interface Where {
  from: string;
  to: string;
  target: string;
  moved: string | undefined;
}

const DIRNAMES = new Set(['__dirname', 'import.meta.dirname']);
const JOINS = /(?:^|\.)(?:join|resolve)$/;

const textOf = (n: Node): string =>
  Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n) ? n.getLiteralValue() : '';

const isText = (n: Node | undefined): boolean =>
  Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n);

/** The literals as a Found when every one is a plain string. */
function found(nodes: (Node | undefined)[]): Found | undefined {
  const texts = nodes.flatMap((n) => (n !== undefined && isText(n) ? [n] : []));
  const [first, ...rest] = texts;
  return first !== undefined && texts.length === nodes.length ? { first, rest } : undefined;
}

/** `new URL('<path>', import.meta.url)` */
function urlPath(n: Node): Found | undefined {
  if (!Node.isNewExpression(n) || n.getExpression().getText() !== 'URL') return undefined;
  const [path, base] = n.getArguments();
  return base?.getText() === 'import.meta.url' ? found([path]) : undefined;
}

/** `join(__dirname, 'a', 'b')`, `path.resolve(import.meta.dirname, 'a')` */
function joinPath(n: Node): Found | undefined {
  if (!Node.isCallExpression(n) || !JOINS.test(n.getExpression().getText())) return undefined;
  const [dir, ...rest] = n.getArguments();
  return DIRNAMES.has(dir?.getText() ?? '') ? found(rest) : undefined;
}

const dotted = (rel: string): string => (rel.startsWith('.') ? rel : `./${rel}`);

function whereOf(f: Found, ctx: PathCtx): Where {
  const from = posix.dirname(ctx.file);
  const target = posix.join(from, ...[f.first, ...f.rest].map(textOf));
  return { from, to: posix.dirname(ctx.to), target, moved: ctx.renamed.get(target) };
}

const lastOf = (f: Found): Node => f.rest.at(-1) ?? f.first;

/** posix.relative drops it, and a folder URL resolves its children only with it. */
const slashed = (f: Found, rel: string): string =>
  textOf(lastOf(f)).endsWith('/') && !rel.endsWith('/') ? `${rel}/` : rel;

/** One literal (or a moved target): the whole new path goes in it. */
const wholeValue = (f: Found, w: Where): string =>
  slashed(f, dotted(posix.relative(w.to, w.moved ?? w.target)));

/** Several literals to an unmoved target: the way back to the old folder goes in front. */
function prefixValue(f: Found, w: Where): string {
  const rel = posix.join(posix.relative(w.to, w.from), textOf(f.first));
  return textOf(f.first).startsWith('./') ? dotted(rel) : rel;
}

const isWhole = (f: Found, w: Where): boolean => f.rest.length === 0 || w.moved !== undefined;

function editOf(f: Found, ctx: PathCtx): Edit | undefined {
  const w = whereOf(f, ctx);
  if (w.moved === undefined && w.from === w.to) return undefined;
  const inside = { start: f.first.getStart() + 1, end: f.first.getEnd() - 1 };
  if (!isWhole(f, w)) return { ...inside, value: prefixValue(f, w) };
  const quote = f.first.getText().charAt(0);
  const value = `${quote}${wholeValue(f, w)}${quote}`;
  return { start: f.first.getStart(), end: lastOf(f).getEnd(), value };
}

/** Edits so the file's own-folder paths (URL and dirname joins) still reach their files. */
export function fixtureEdits(sf: SourceFile, ctx: PathCtx): Edit[] {
  const out: Edit[] = [];
  sf.forEachDescendant((n) => {
    const hit = urlPath(n) ?? joinPath(n);
    const edit = hit === undefined ? undefined : editOf(hit, ctx);
    if (edit !== undefined) out.push(edit);
  });
  return out;
}
