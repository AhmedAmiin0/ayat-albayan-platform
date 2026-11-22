// The head tree's module graph for the facade rules (pure-move/facade.mjs, deps.mjs): which file
// a specifier names, which names a module exports and whether one comes through a given module.
// It reads with `git show` and parses with the gate's own statement regexes (`normalize`): the
// refactor job installs nothing, so no TypeScript parser.
import { target } from '../pure-move-paths.mjs';
import { entriesOf, nsName, statementsOf } from './statements.mjs';

const KEYWORD = '(?:const|let|var|function\\*?|class|interface|type|enum|namespace)';
const DECL = new RegExp(
  `^[ \\t]*export\\s+(?:declare\\s+)?(?:async\\s+)?(?:abstract\\s+)?${KEYWORD}\\s+([\\w$]+)`,
  'gm',
);
const LOCAL = /^[ \t]*export\s+(?:type\s+)?\{([^}]*)\}(?!\s*from\b)/gm;
const DEFAULT = /^[ \t]*export\s+default\b/m;
const EXT = /\.[cm]?[jt]sx?$/;
export const WORKSPACE = /^@ab\/[a-z0-9-]+$/;

const candidates = (t) => {
  const base = t.replace(/\.[cm]?js$/, '');
  return [t, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
};
const stems = (file) => {
  const stem = file.replace(EXT, '');
  return [stem, stem.replace(/\/index$/, '')];
};
const ENDS = [
  [(file, walk) => file === walk.goal, 'via'],
  [(file) => file === null, 'own'],
  [(file, walk) => walk.seen.has(file), null],
];
const RANK = ['own', 'via'];
const name = (e) => e.alias || e.name;
const ADD = {
  star: (mod, s) => mod.stars.push(s.spec),
  ns: (mod, s) => mod.own.add(nsName(s.text)),
  list: (mod, s) =>
    s.entries.forEach((e) => mod.named.set(name(e), { spec: s.spec, name: e.name })),
};

function moduleOf(n) {
  const own = new Set([...n.raw.matchAll(DECL)].map((m) => m[1] ?? ''));
  const local = [...n.raw.matchAll(LOCAL)].flatMap((m) => entriesOf(`{${m[1]}}`) ?? []);
  local.forEach((e) => own.add(name(e)));
  if (DEFAULT.test(n.raw)) own.add('default');
  const mod = { own, named: new Map(), stars: [] };
  for (const s of statementsOf(n).filter((x) => x.kind === 'export')) ADD[s.shape]?.(mod, s);
  return mod;
}

/** Word-bounded alternatives for git grep -E and RegExp alike. */
const wordsRe = (names) => {
  const words = [...names].map((n) => n.replaceAll('$', '\\$')).join('|');
  return `(^|[^A-Za-z0-9_$])(${words})([^A-Za-z0-9_$]|$)`;
};
const needleOf = (file) => {
  const pkg = /^packages\/([a-z0-9-]+)\/src\/index\.ts$/.exec(file);
  const leaf = (stems(file)[1] ?? '').split('/').pop() ?? '';
  return pkg ? `@ab/${pkg[1]}['"]` : `[/'"]${leaf.replaceAll('.', '\\.')}`;
};
const takesAll = (s) => s.shape === 'star' || s.shape === 'ns';
const usesAny = (s, names) => takesAll(s) || s.entries.some((e) => names.has(e.name));
const union = (sets) => new Set(sets.flatMap((s) => [...(s ?? [])]));

/** The head graph over `{ read(file) → text or '', grep(ere) → files }` and the gate's parser. */
export function headModules({ read, grep }, normalize) {
  const memo = new Map();
  const load = (file) => moduleOf(normalize(read(file)));
  const parse = (file) => memo.get(file) ?? memo.set(file, load(file)).get(file);
  const resolve = (from, spec) => {
    const t = target(from, spec);
    return t === null ? null : (candidates(t).find((f) => read(f) !== '') ?? null);
  };
  const origin = (file, wanted, walk) => {
    const end = ENDS.find(([test]) => test(file, walk));
    if (end) return end[1];
    walk.seen.add(file);
    const mod = parse(file);
    const pick = mod.named.get(wanted);
    if (mod.own.has(wanted)) return 'own';
    if (pick) return origin(resolve(file, pick.spec), pick.name, walk) ?? 'own';
    const found = mod.stars.map((spec) => origin(resolve(file, spec), wanted, walk));
    return RANK.find((r) => found.includes(r)) ?? null;
  };
  const namesOf = (file, seen = new Set()) => {
    if (file === null) return null;
    if (seen.has(file)) return new Set();
    seen.add(file);
    const mod = parse(file);
    const subs = mod.stars.map((spec) => namesOf(resolve(file, spec), seen));
    return subs.includes(null) ? null : union([mod.own, new Set(mod.named.keys()), ...subs]);
  };
  const points = (file) => (from, s) =>
    stems(file).includes((target(from, s.spec) ?? '\0').replace(EXT, ''));
  return {
    normalize,
    resolve,
    namesOf,
    /** True when `oldSpec` (from `from`) exports `next.name` only through module `next.spec`. */
    reexports: (from, oldSpec, next) => {
      const [was, goal] = [resolve(from, oldSpec), resolve(next.to, next.spec)];
      const via = () => origin(was, next.name, { goal, seen: new Set() }) === 'via';
      return was !== null && goal !== null && via();
    },
    /** True when no head file imports one of `names` from `file` (or takes all of it with `*`). */
    unused: (file, names) => {
      const pool = new Set(grep(needleOf(file)));
      const found = [...grep(wordsRe(names)), ...grep('(import|export)[^;]*\\*')];
      const hits = found.filter((f) => pool.has(f));
      const at = points(file);
      const imported = (f) => statementsOf(normalize(read(f)));
      const use = (f) => imported(f).some((s) => at(f, s) && usesAny(s, names));
      return ![...new Set(hits)].some(use);
    },
  };
}
