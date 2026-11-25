// The verdict of the package-boundary gate: which edges are fatal, which are extras (outside
// `allowed`), and, on a PR, what the head added against its base branch.
import { appsOf, validateTable, widened } from './packages-table.mjs';

const TOOLING = 'T';
const SHOWN = 3;
const COUNTS = { reexports: 're-exports', dbScope: 'db scope', facade: 'facade imports' };
const WIDENED =
  "::warning title=guard:packages::layer table widened: merge only with the repository owner's go";

const reaches = (reach, to) => reach === '*' || (reach ?? []).includes(to);

const tooling = (t) => t.layers.find((l) => l.name === TOOLING)?.packages ?? [];

/** Never extras: to itself, into the tooling layer, e2e's build-only and path reach. */
const EXEMPT = [
  (t, e) => e.to === e.from || tooling(t).includes(e.to),
  (t, e) => e.kind === 'dev' && (t.appsBuildOnly[e.from] ?? []).includes(e.to),
  (t, e) => e.kind === 'path' && reaches(t.pathReach[e.from], e.to),
];
const exempt = (t, e) => EXEMPT.some((rule) => rule(t, e));
const listed = (t, e) => (t.allowed[e.from] ?? []).includes(e.to);

export const keyOf = (e) => `${e.from} → ${e.to} (${e.kind})`;

const few = (files) => `${files.slice(0, SHOWN).join(', ')}${files.length > SHOWN ? ' …' : ''}`;

/** `Map<key, { from, to, kind, files }>` with each edge's files sorted once. */
function group(edges) {
  const out = new Map();
  for (const e of edges) {
    const g = out.get(keyOf(e)) ?? { from: e.from, to: e.to, kind: e.kind, files: new Set() };
    out.set(keyOf(e), { ...g, files: g.files.add(e.file) });
  }
  return new Map([...out].sort().map(([k, g]) => [k, { ...g, files: [...g.files].sort() }]));
}

/** `{ extras, fatal, counts }` of one scanned side under `table`. */
export function judge(table, facts) {
  const apps = appsOf(table);
  const open = facts.edges.filter((e) => !exempt(table, e));
  const intoApp = group(open.filter((e) => apps.has(e.to)));
  const extras = group(open.filter((e) => !apps.has(e.to) && !listed(table, e)));
  const fatal = [
    ...[...intoApp].map(([k, g]) => `${k}: an edge into an app (${few(g.files)})`),
    ...facts.aliases.map((f) => `${f}: '@/' alias in a package`),
  ];
  return { extras, fatal, counts: facts.counts };
}

const rises = (head, base) =>
  Object.entries(COUNTS).flatMap(([k, label]) =>
    Object.entries(head[k] ?? {})
      .filter(([ws, n]) => n > (base[k]?.[ws] ?? 0))
      .map(([ws, n]) => `${label} ${ws}: ${n} > the base branch's ${base[k]?.[ws] ?? 0}`),
  );

const countLines = (counts) =>
  Object.entries(COUNTS).map(([k, label]) => {
    const nonZero = Object.entries(counts[k] ?? {}).filter(([, n]) => n > 0);
    const total = nonZero.reduce((s, [, n]) => s + n, 0);
    return `${label}: ${total} ${JSON.stringify(Object.fromEntries(nonZero))}`;
  });

/** What only the head has against its base side: new extras and risen counts. */
function against(head, base) {
  const added = [...head.extras.keys()].filter((k) => !base.extras.has(k));
  return [
    ...added.map((k) => `new extra ${k}: ${few(head.extras.get(k).files)}`),
    ...rises(head.counts, base.counts),
  ];
}

/**
 * `{ lines, warnings, failed }` for the head side (and, on a PR, its base side scanned with the
 * head's table). Fatal edges and table errors always fail; on a PR so do new extras and risen
 * counts.
 */
export function decide({ table, baseTable, head, base }) {
  const h = judge(table, head);
  const problems = [...validateTable(table), ...h.fatal];
  const regressions = base === undefined ? [] : against(h, judge(table, base));
  const lines = [
    ...[...h.extras].map(([k, g]) => `extra ${k}: ${few(g.files)}`),
    ...countLines(h.counts),
    ...problems.map((p) => `fatal: ${p}`),
    ...regressions,
  ];
  const warnings = widened(table, baseTable) ? [WIDENED] : [];
  return { lines, warnings, failed: problems.length + regressions.length > 0 };
}
