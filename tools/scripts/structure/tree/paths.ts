import { posix } from 'node:path';
import { follow } from './follow.ts';
import type { Moves } from './tree.types.ts';

const LITERAL = /(['"`])(\.{1,2}\/[^'"`$\s]*)\1/g;
/** A module specifier the import rewriter already follows. */
const SPECIFIER = /(?:\b(?:from|import)\s*|\b(?:require|import|mock|doMock|unmock|importActual|requireActual|importMock|requireMock|resolve)\(\s*)$/;
const DIRNAME_TEMPLATE = /\$\{(?:__dirname|import\.meta\.dirname)\}(\/[^`'"$\s]*)/g;
const DIRNAME_JOIN = /\b(?:join|resolve)\(\s*(?:__dirname|import\.meta\.dirname)\s*((?:,\s*['"][^'"]*['"]\s*)+)\)/g;

/** Paths a file reads relative to its own folder, other than module specifiers. */
export function relativeReads(text: string): string[] {
  const literals = [...text.matchAll(LITERAL)]
    .filter((m) => !SPECIFIER.test(text.slice(Math.max(0, m.index - 40), m.index)))
    .map((m) => m[2]);
  const templates = [...text.matchAll(DIRNAME_TEMPLATE)].map((m) => `.${m[1]}`);
  const joins = [...text.matchAll(DIRNAME_JOIN)].map((m) =>
    [...m[1].matchAll(/['"]([^'"]*)['"]/g)].map((a) => a[1]).join('/'),
  );
  return [...literals, ...templates, ...joins];
}

const resolveFrom = (file: string, rel: string): string =>
  posix.normalize(posix.join(posix.dirname(file), rel)).replace(/\/$/, '');

/** A relative read that no longer reaches the file or folder it reached before the moves. */
export function pathProblems(
  sources: readonly { file: string; text: string }[],
  moves: Moves,
): string[] {
  return sources.flatMap(({ file, text }) => {
    const newFile = moves.files.get(file) ?? file;
    return relativeReads(text).flatMap((rel) => {
      const was = resolveFrom(file, rel);
      const want = follow(was, moves);
      if (want === undefined || resolveFrom(newFile, rel) === want) return [];
      return [`relative path breaks: ${file} reads '${rel}' (${was} → ${want})`];
    });
  });
}
