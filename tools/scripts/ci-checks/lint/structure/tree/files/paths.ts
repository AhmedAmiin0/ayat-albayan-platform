import { posix } from 'node:path';
import { follow } from './follow.ts';
import type { Moves, Read } from '../tree.types.ts';

const LITERAL = /(['"`])(\.{1,2}\/[^'"`$\s]*)\1/g;
const TEMPLATE_HEAD = /`(\.{1,2}\/[^`$\s]*)\$\{/g;
/** A module specifier the import rewriter already follows. */
const SPECIFIER =
  /(?:\b(?:from|import)\s*|\b(?:require|import|mock|doMock|unmock|importActual|requireActual|importMock|requireMock|resolve)\(\s*)$/;
const DIRNAME = /\$\{(__dirname|import\.meta\.dirname)\}(\/[^`'"$\s]*)/g;
const JOIN =
  /\b(?:join|resolve)\(\s*(?:__dirname|import\.meta\.dirname)\s*((?:,\s*['"][^'"]*['"]\s*){2,})\)/g;

const asRel = (rel: string): string => (rel.startsWith('.') ? rel : `./${rel}`);

/** Paths a file reads relative to its own folder (not module specifiers), each with its rewrite. */
export function relativeReads(text: string): Read[] {
  const literals = [...text.matchAll(LITERAL)]
    .filter((m) => !SPECIFIER.test(text.slice(Math.max(0, m.index - 40), m.index)))
    .map(([snippet, quote = '', rel = '']) => ({
      rel,
      snippet,
      put: (r: string) => `${quote}${asRel(r)}${quote}`,
    }));
  const heads = [...text.matchAll(TEMPLATE_HEAD)].map(([snippet, head = '']) => {
    const cut = head.lastIndexOf('/');
    const tail = head.slice(cut);
    return { rel: head.slice(0, cut), snippet, put: (r: string) => `\`${asRel(r)}${tail}\${` };
  });
  const dirnames = [...text.matchAll(DIRNAME)].map(([snippet, name = '', rest = '']) => ({
    rel: `.${rest}`,
    snippet,
    put: (r: string) => (r === '' ? `\${${name}}` : `\${${name}}/${r}`),
  }));
  const joins = [...text.matchAll(JOIN)].map(([snippet, args = '']) => ({
    rel: [...args.matchAll(/['"]([^'"]*)['"]/g)].map(([, a = '']) => a).join('/'),
    snippet,
  }));
  return [...literals, ...heads, ...dirnames, ...joins];
}

const resolveFrom = (file: string, rel: string): string =>
  posix.normalize(posix.join(posix.dirname(file), rel)).replace(/\/$/, '');

export interface PathFixes {
  edits: Map<string, [string, string][]>;
  problems: string[];
}

interface Broken {
  file: string;
  read: Read;
  rel: string;
  want: string;
}

function brokenReads(src: { file: string; text: string }, moves: Moves): Broken[] {
  const newFile = moves.files.get(src.file) ?? src.file;
  return relativeReads(src.text).flatMap((read) => {
    const want = follow(resolveFrom(src.file, read.rel), moves);
    if (want === undefined || resolveFrom(newFile, read.rel) === want) return [];
    return [{ file: src.file, read, want, rel: posix.relative(posix.dirname(newFile), want) }];
  });
}

/** Relative reads that the moves break, rewritten to reach the same file or folder again. */
export function pathFixes(
  sources: readonly { file: string; text: string }[],
  moves: Moves,
): PathFixes {
  const broken = sources.flatMap((s) => brokenReads(s, moves));
  const edits = new Map<string, [string, string][]>();
  for (const b of broken) {
    const put = b.read.put?.(b.rel);
    if (put !== undefined) edits.set(b.file, [...(edits.get(b.file) ?? []), [b.read.snippet, put]]);
  }
  const problems = broken
    .filter((b) => b.read.put === undefined)
    .map((b) => `relative path breaks: ${b.file} reads '${b.read.rel}' (now ${b.want})`);
  return { edits, problems };
}

export const applyEdits = (text: string, edits: readonly [string, string][]): string =>
  edits.reduce((acc, [from, to]) => acc.replaceAll(from, to), text);
