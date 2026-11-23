// What makes a lint config looser (docs/59): a rule set to off, 0 or warn, a new ignore glob, a new
// syntaxExempt or exempt scope, or a raised numeric limit. Read from the text of the config sources
// (sources.mjs), base against head; a warning, never a failure: such a PR needs the owner's go.

const KEY = String.raw`(?:'([^'\s]+)'|"([^"\s]+)"|(?<![\w/-])([\w@/-]+))`;
const ENTRY = new RegExp(String.raw`${KEY}\s*:\s*\[([^\]]*)\]`, 'g');
const LEVEL = new RegExp(String.raw`${KEY}\s*:\s*\[?\s*(?:'(off|warn)'|"(off|warn)"|(0)(?![\w.]))`, 'g');
const SCALAR = new RegExp(String.raw`${KEY}\s*:\s*(\d+)(?![\w.])`, 'g');
const IGNORES = /['"]?(?:ignores?|ignorePatterns|ignore[A-Z]\w*)['"]?\s*:\s*\[([^\]]*)\]|globalIgnores\(\s*\[([^\]]*)\]/g;
const IGNORE_FLAG = /--ignore-pattern[= ]['"]?([^\s'"]+)/g;
const EXEMPT_CALL = /syntaxExempt\(\{[^}]*\}\)/g;
const EXEMPT_LIST = /\bexempt\s*:\s*\[([^\]]*)\]/g;
const STRING = /(['"])(.*?)\1/g;

const keyOf = (m) => m[1] ?? m[2] ?? m[3];
const numbers = (text) => [...text.matchAll(/\b\d+\b/g)].map(Number);
const strings = (text = '') => [...text.matchAll(STRING)].map((m) => m[2]);
const isRuleName = (m) => m[3] === undefined || /[-/]/.test(m[3]);

/** The numbers in each `rule: [ … ]` entry of a config source (`complexity: ['error', 8]`). */
export function limits(text, rule) {
  return [...text.matchAll(ENTRY)].filter((m) => keyOf(m) === rule).flatMap((m) => numbers(m[4]));
}

/** `level rule` of every rule set to off (or 0) or warn, as a count per entry. */
function levels(text) {
  return [...text.matchAll(LEVEL)]
    .filter((m) => m[6] === undefined || isRuleName(m))
    .map((m) => `${m[4] ?? m[5] ?? 'off'}: ${keyOf(m)}`);
}

/** Every numeric limit: `key → numbers`, from `rule: [ … ]` entries and from `"key": n` values. */
function limitTable(text) {
  const table = new Map();
  const add = (key, ns) => table.set(key, [...(table.get(key) ?? []), ...ns]);
  for (const m of text.matchAll(ENTRY)) add(keyOf(m), numbers(m[4]));
  for (const m of text.replace(ENTRY, '').matchAll(SCALAR)) add(keyOf(m), [Number(m[4])]);
  return table;
}

const ignores = (text) => [
  ...[...text.matchAll(IGNORES)].flatMap((m) => strings(m[1] ?? m[2])),
  ...[...text.matchAll(IGNORE_FLAG)].map((m) => m[1]),
];
const exemptions = (text) => [...text.matchAll(EXEMPT_CALL)].map((m) => m[0].replace(/\s+/g, ' '));
const exemptScopes = (text) => [...text.matchAll(EXEMPT_LIST)].flatMap((m) => strings(m[1]));

/** The items of `head` beyond `base`, counted as multisets (an added copy counts too). */
function beyond(head, base) {
  const left = new Map();
  for (const item of base) left.set(item, (left.get(item) ?? 0) + 1);
  return head.filter((item) => {
    const n = left.get(item) ?? 0;
    left.set(item, n - 1);
    return n <= 0;
  });
}

function raised(base, head) {
  const was = limitTable(base);
  return [...limitTable(head)]
    .filter(([key]) => (was.get(key) ?? []).length > 0)
    .flatMap(([key, ns]) => {
      const old = was.get(key) ?? [];
      const looser = beyond(ns, old).filter((n) => n > Math.min(...old));
      return looser.map((n) => `raised limit: ${key} ${n} (was ${old.join(', ')})`);
    });
}

const unique = (lines) => [...new Set(lines)];

/** One line per way `head` is looser than `base` (both: the config sources' text). */
export function loosened({ base, head }) {
  return unique([
    ...beyond(levels(head), levels(base)).map((line) => `rule ${line}`),
    ...beyond(ignores(head), ignores(base)).map((glob) => `new ignore: ${glob}`),
    ...beyond(exemptions(head), exemptions(base)).map((call) => `new exemption: ${call}`),
    ...beyond(exemptScopes(head), exemptScopes(base)).map((scope) => `new exempt scope: ${scope}`),
    ...raised(base, head),
  ]);
}
