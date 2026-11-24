// No inline escapes (docs/59): a comment that turns a lint rule, a type check, coverage, mutation
// testing or duplicate detection off for some code. Comments come from the AST
// (comment-only/comments.mjs), so a string or a template that spells one is never read as one.
import { commentsOf } from '../../comment-only/comments.mjs';

/** Each tool reads its directive only at the start of a comment (`//`, `/*`, `/**`). */
const START = String.raw`^\/[/*][\s*]*`;
const FORMS = [
  '(?:eslint|oxlint)-disable',
  '@ts-(?:expect-error|ignore|nocheck)\\b',
  '(?:istanbul|c8|v8)\\s+ignore\\b',
  'Stryker\\s+disable\\b',
  'jscpd:ignore',
  'biome-ignore\\b',
];
const ESCAPE = new RegExp(`${START}(?:${FORMS.join('|')})`);

/** A cheap text test first: only files that spell a form are parsed. */
export const mayHold = (text) => /disable|@ts-|ignore/.test(text);

const ROOTS = /^(apps|packages|tools|e2e|docs\/design\/brand\/tools)\//;
const CODE = /\.(?:[mc]?ts|tsx|[mc]?js|jsx)$/;
const GENERATED = /\.gen\.ts$|^packages\/db\/src\/types\.ts$/;

/** Code files the guard reads: the linted folders, generated files left out (lint skips them). */
export const inScope = (path) => ROOTS.test(path) && CODE.test(path) && !GENERATED.test(path);

/** Every escape comment of a file, with its line. */
export function escapesOf(text, file) {
  let from = 0;
  return commentsOf(text, file).flatMap((comment) => {
    const at = text.indexOf(comment, from);
    from = at + comment.length;
    const line = text.slice(0, at).split('\n').length;
    return ESCAPE.test(comment) ? [{ line, comment }] : [];
  });
}
