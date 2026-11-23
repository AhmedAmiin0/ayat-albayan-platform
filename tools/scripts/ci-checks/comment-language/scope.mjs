// Which files the language check reads, and how their comments are found.
import { CODE, FORBIDDEN } from '../comment-only/patterns.mjs';

const CODE_ROOTS = /^(?:apps|packages|tools|e2e|docs\/design\/brand\/tools)\//;
const HASH = /^\.github\/.*\.(?:ya?ml|sh)$/;

const excluded = (path) => FORBIDDEN.some(({ test }) => test.test(path));

const KINDS = [
  { kind: 'code', test: (path) => CODE_ROOTS.test(path) && CODE.test(path) },
  { kind: 'hash', test: (path) => HASH.test(path) },
];

/** 'code', 'hash' or null; migrations, generated and built files stay out, as in guard:comments. */
export const scopeOf = (path) =>
  excluded(path) ? null : (KINDS.find(({ test }) => test(path))?.kind ?? null);
