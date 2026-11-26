// Production counts land in public Actions logs: only `select count(*) from <table> [where …]` is
// accepted, on a table in public, with no subquery, function call or second statement that could
// expose or change a value.
const NAME_LINE = /^--\s*count:\s*([a-z][a-z0-9_]*)\s*$/;
const COUNT = /^select count\(\*\) from (?:public\.)?[a-z_][a-z0-9_]*(?: where (.+))?$/i;
const LITERAL = /'(?:[^']|'')*'/g;
// Postgres ends a string where LITERAL does only when it has no backslash and no control
// character, and a quoted name can call a function: a count needs none of them. Each string
// becomes a backtick, which is no SQL, so what is left is the statement's own code.
const UNREADABLE = /[\\"`]|[^\x20-￿]/;
// A word before a string is a prefix (E, U&, B, X) or a type name, whose input function can
// read the catalog (`regclass 'x'`): only an operator or a bracket comes before a string.
const FORBIDDEN = /;|--|\/\*|\$|'|[a-z0-9_&]\s*`|[^\x20-\x7e]|\b(?:select|table|values)\b/i;
// A dot before a name selects a field, which can also call a function of the row (`t.fn`), and
// a cast to any type but text can read the catalog too: one table's own columns need neither.
const REACHES_OUT = /\.\s*[a-z_]|::(?!\s*text\b)/i;
const OPERATORS = new Set(['in', 'and', 'or', 'not']);
// No word boundary before the name: `1left(x)` is a call on servers that split it there.
const CALL = /([a-z_][a-z0-9_]*)\s*\(/gi;
// Standard SQL calls the first group without parentheses, so CALL cannot see them. The second
// group starts a clause after the condition, and a count has none.
const REFUSED_WORDS = new Set([
  'current_catalog',
  'current_date',
  'current_role',
  'current_schema',
  'current_time',
  'current_timestamp',
  'current_user',
  'localtime',
  'localtimestamp',
  'session_user',
  'system_user',
  'user',
  'except',
  'fetch',
  'for',
  'group',
  'having',
  'intersect',
  'limit',
  'offset',
  'order',
  'union',
  'window',
]);
const WORD = /[a-z_][a-z0-9_]*/gi;
// A bare name follows search_path, where pg_catalog comes first, so the schema is always sent.
const FROM = /^(select count\(\*\) from )(?:public\.)?/i;
const MAX_LENGTH = 65_536;

const hasCall = (where) =>
  [...where.matchAll(CALL)].some(([, word]) => !OPERATORS.has(word.toLowerCase()));

const hasRefusedWord = (where) =>
  (where.match(WORD) ?? []).some((word) => REFUSED_WORDS.has(word.toLowerCase()));

const isPlainWhere = (where) => {
  const bare = where.replace(LITERAL, '`');
  const refused = [
    UNREADABLE.test(where),
    FORBIDDEN.test(bare),
    REACHES_OUT.test(bare),
    hasCall(bare),
    hasRefusedWord(bare),
  ];
  return !refused.includes(true);
};

const isPlainCount = (sql) => {
  const match = COUNT.exec(sql);
  return match !== null && isPlainWhere(match[1] ?? '');
};

const assertNoProblem = (checks) => {
  const problem = checks.find(([bad]) => bad);
  if (problem) throw new Error(problem[1]);
};

const skipLine = () => undefined;
const nameNext = (line, state) => (state.name = NAME_LINE.exec(line)?.[1] ?? null);
const addPart = (line, state) => state.parts.push(line);

const LINE_KIND = [
  [(line) => line === '', skipLine],
  [(line) => NAME_LINE.test(line), nameNext],
  [(line) => line.startsWith('--'), skipLine],
  [() => true, addPart],
];

const closeStatement = (state) => {
  const index = state.items.length + 1;
  const sql = state.parts.join(' ').replace(/\s+/g, ' ').slice(0, -1).trim();
  const checks = [
    [state.name === null, `statement ${index} has no name`],
    [
      state.items.some((item) => item.name === state.name),
      `statement ${index} repeats the name ${state.name}`,
    ],
    [!isPlainCount(sql), `statement ${index} is not a plain count`],
  ];
  assertNoProblem(checks);
  state.items.push({ name: state.name, sql: sql.replace(FROM, '$1public.') });
  Object.assign(state, { name: null, parts: [] });
};

// Only a statement's own line ends it: a comment that ends with `;` would cut it short.
const endsStatement = (handle, line) => handle === addPart && line.endsWith(';');

const readLine = (state, raw) => {
  const line = raw.trim();
  const [, handle] = LINE_KIND.find(([matches]) => matches(line)) ?? LINE_KIND[0];
  handle(line, state);
  if (endsStatement(handle, line)) closeStatement(state);
};

export const parseCounts = (text) => {
  assertNoProblem([[text.length > MAX_LENGTH, 'counts file is too long']]);
  const state = { items: [], name: null, parts: [] };
  text.split('\n').forEach((line) => readLine(state, line));
  assertNoProblem([
    [state.parts.length > 0, `statement ${state.items.length + 1} does not end with ;`],
    [state.items.length === 0, 'no count statements'],
  ]);
  return state.items;
};
