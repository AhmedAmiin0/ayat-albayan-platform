// What a comment-only change may touch. A directive comment steers a tool (lint, types, coverage,
// bundler, formatter, duplication, knip), so removing or editing one changes behaviour.

/** Each entry: the tool it steers and a test on the comment's full text, `//`/`/*` included. */
export const DIRECTIVES = [
  { tool: 'eslint', test: /^\/[/*]\s*eslint[\s-]/ },
  { tool: 'oxlint', test: /^\/[/*]\s*oxlint[\s-]/ },
  { tool: 'typescript', test: /@ts-(?:expect-error|ignore|nocheck|check)\b/ },
  { tool: 'typescript reference', test: /^\/\/\/\s*<(?:reference|amd-)/ },
  { tool: 'test environment', test: /@(?:jest|vitest)-environment\b/ },
  { tool: 'coverage', test: /\b(?:istanbul|c8|v8)\s+ignore\b/ },
  { tool: 'vite', test: /@vite-ignore\b/ },
  { tool: 'webpack', test: /\bwebpack[A-Z]\w*\s*:/ },
  { tool: 'prettier', test: /\bprettier-ignore\b/ },
  { tool: 'jscpd', test: /\bjscpd:ignore/ },
  { tool: 'deprecation', test: /@deprecated\b/ },
  { tool: 'jsx pragma', test: /@jsx(?:Runtime|ImportSource|Frag)?\b/ },
  { tool: 'knip', test: /@(?:public|internal)\b/ },
];

export const isDirective = (comment) => DIRECTIVES.some(({ test }) => test.test(comment));

/** Source files whose comments may go. */
export const CODE = /\.(?:ts|tsx|js|mjs|cjs)$/;

/** Lint baselines: dropping a comment can fix a suppressed warning (guard:lint: only shrink). */
export const SUPPRESSIONS = /(?:^|\/)(?:eslint|oxlint)-suppressions\.json$/;

/** Never touched by a comment sweep, even when only their comments change. */
export const FORBIDDEN = [
  { why: 'a migration', test: /^packages\/db\/supabase\/migrations\// },
  { why: 'generated db types', test: /^packages\/db\/src\/types\.ts$/ },
  { why: 'a generated file', test: /\.gen\.ts$/ },
  { why: 'a build output', test: /(?:^|\/)dist\// },
];

export const BRANCH = /^chore\/comments-/;
