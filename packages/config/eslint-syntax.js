// docs/36 §1.1: the selector checks (H-1, H-2, Z-2, Z-5, F-1) in ONE list. Each group is its own
// `ab/*` rule built on ESLint's no-restricted-syntax, so a package's no-restricted-syntax block
// (the React list, eslint-react.js) can never replace or drop them (docs/32 critic #17), and each
// group has its own baseline and count (pnpm guard:lint).
import { builtinRules } from 'eslint/use-at-your-own-risk';

const H1 = 'H-1: call other services through the runtime HTTP client (docs/36 §3), not fetch.';
const H2 = 'H-2: parse the response with a zod schema, not `await res.json() as T`.';
const Z2 = 'Z-2: boundary data goes through a zod schema, not a hand shape check (docs/36 §1.1).';
const Z5 = 'Z-5: pass a zod schema (apiFetch(path, { schema })), not a type argument.';
const F1 = 'F-1: an else-if chain of 3+: use a lookup table or per-kind strategy (CLAUDE.md 11).';
const unknownGuard =
  ':function[params.0.typeAnnotation.typeAnnotation.type=\'TSUnknownKeyword\']' +
  '[returnType.typeAnnotation.type=\'TSTypePredicate\']';

/** The selector list: rule → its no-restricted-syntax entries (full names: pnpm guard:lint). */
export const SYNTAX = {
  'ab/no-global-fetch': [
    { selector: "MemberExpression[object.name='globalThis'][property.name='fetch']", message: H1 },
  ],
  'ab/no-unchecked-json': [
    { selector: "TSAsExpression > AwaitExpression > CallExpression[callee.property.name='json']", message: H2 },
  ],
  'ab/no-shape-checks': [
    { selector: "BinaryExpression[operator='in']", message: Z2 },
    { selector: "BinaryExpression[left.operator='typeof'][right.value='object']", message: Z2 },
    { selector: "CallExpression[callee.object.name='JSON'][callee.property.name='parse']", message: Z2 },
    { selector: unknownGuard, message: Z2 },
  ],
  'ab/no-untyped-api-calls': [
    { selector: 'CallExpression[callee.name=/^api(Fetch|Send)$/][typeArguments]', message: Z5 },
    { selector: 'CallExpression[callee.property.name=/^api(Fetch|Send)$/][typeArguments]', message: Z5 },
  ],
  'ab/no-if-chains': [
    {
      selector: "IfStatement[alternate.type='IfStatement'][alternate.alternate.type='IfStatement']",
      message: F1,
    },
  ],
};

const core = builtinRules.get('no-restricted-syntax');

/** The rules for the `ab` plugin: every SYNTAX group runs ESLint's own selector rule. */
export const syntaxRules = Object.fromEntries(
  Object.keys(SYNTAX).map((name) => [name.replace(/^ab\//, ''), core]),
);

/** Every group as an error, plus H-1's `fetch` global. */
export const syntaxErrors = {
  'no-restricted-globals': ['error', { name: 'fetch', message: H1 }],
  ...Object.fromEntries(
    Object.entries(SYNTAX).map(([name, list]) => [name, ['error', ...list]]),
  ),
};

/** The rules each exemption turns off: H-1 (the HTTP clients) and Z-2 (shape checks). */
const EXEMPT = {
  http: ['no-restricted-globals', 'ab/no-global-fetch'],
  shapes: ['ab/no-shape-checks'],
};

/**
 * Flat-config block: `files` may use fetch (`http`: the HTTP client cores, local file reads, test
 * doubles) or hand shape checks (`shapes`), docs/36 §1.1 «Stays exempt».
 */
export function syntaxExempt({ files, ...groups }) {
  const chosen = Object.keys(EXEMPT).filter((group) => groups[group]);
  const off = chosen.flatMap((group) => EXEMPT[group]);
  return { files, rules: Object.fromEntries(off.map((rule) => [rule, 'off'])) };
}

/** The base blocks: every group on; `tests` (tests and fakes) call servers and read raw bodies. */
export const syntaxBlocks = (tests) => [
  { rules: syntaxErrors },
  syntaxExempt({ files: tests, http: true, shapes: true }),
];
