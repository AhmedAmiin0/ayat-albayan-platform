// Production counts land in public Actions logs: only `select count(*) from <table> [where …]` is
// accepted, on a table in public, with no subquery, function call or second statement that could
// expose or change a value.
const NAME_LINE = /^--\s*count:\s*([a-z][a-z0-9_]*)\s*$/;
const COUNT = /^select count\(\*\) from (?:public\.)?[a-z_][a-z0-9_]*(?: where (.+))?$/i;
const LITERAL = /'(?:[^']|'')*'/g;
// Postgres ends a string where LITERAL does only when it has no backslash and no prefix (E, U&,
// B, X), and a quoted name can call a function: a count needs none of them. Each string becomes
// a backtick, which is no SQL, so what is left is the statement's own code.
const UNREADABLE = /[\\"`]/;
const FORBIDDEN = /;|--|\/\*|\$|'|[a-z0-9_&]`|[^\x20-\x7e]|\b(?:select|table|values)\b/i;
const OPERATORS = new Set(['in', 'and', 'or', 'not']);
const CALL = /\b([a-z_][a-z0-9_]*)\s*\(/gi;

const hasCall = (where) =>
  [...where.matchAll(CALL)].some(([, word]) => !OPERATORS.has(word.toLowerCase()));

const isPlainWhere = (where) => {
  const bare = where.replace(LITERAL, '`');
  return !UNREADABLE.test(where) && !FORBIDDEN.test(bare) && !hasCall(bare);
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
  state.items.push({ name: state.name, sql });
  Object.assign(state, { name: null, parts: [] });
};

const endsStatement = (state, line) => state.parts.length > 0 && line.endsWith(';');

const readLine = (state, raw) => {
  const line = raw.trim();
  const [, handle] = LINE_KIND.find(([matches]) => matches(line)) ?? LINE_KIND[0];
  handle(line, state);
  if (endsStatement(state, line)) closeStatement(state);
};

export const parseCounts = (text) => {
  const state = { items: [], name: null, parts: [] };
  text.split('\n').forEach((line) => readLine(state, line));
  assertNoProblem([
    [state.parts.length > 0, `statement ${state.items.length + 1} does not end with ;`],
    [state.items.length === 0, 'no count statements'],
  ]);
  return state.items;
};
