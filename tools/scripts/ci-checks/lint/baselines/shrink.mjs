// The refactor/guards and refactor/folder-cap baselines are old debt (docs/59): against the base
// branch an entry may only shrink or go, followed through renames. A new entry, a raised number or
// a new baseline file fails.

const pathAndRest = (line) => {
  const cut = line.indexOf(' ');
  return cut === -1 ? { path: line, rest: '' } : { path: line.slice(0, cut), rest: line.slice(cut) };
};

const MEASURE = {
  string: (key) => [{ ...pathAndRest(key), n: 1 }],
  number: (key, n) => [{ path: key, rest: '', n }],
  object: (key, fields) =>
    Object.entries(fields)
      .filter(([, n]) => typeof n === 'number')
      .map(([field, n]) => ({ path: key, rest: ` ${field}`, n })),
};

/** Every entry of a baseline: list lines count 1, a number itself, an object each numeric field. */
export function measures(value) {
  const pairs = Array.isArray(value) ? value.map((line) => [line]) : Object.entries(value);
  return pairs.flatMap(([key, n]) => MEASURE[typeof (n ?? key)](key, n));
}

const keyOf = ({ path, rest }) => `${path}${rest}`;

/** The failure lines of baseline `name` (`base` undefined: the base branch lacks the file). */
export function grown(name, { base, head }, move) {
  if (base === undefined) return [`new baseline file: ${name} (fix the code, never add a baseline)`];
  const was = new Map();
  for (const e of measures(base)) {
    const key = keyOf({ ...e, path: move(e.path) });
    was.set(key, (was.get(key) ?? 0) + e.n);
  }
  return measures(head).flatMap((e) => {
    const before = was.get(keyOf(e));
    if (before === undefined) return [`new entry: ${name} ${keyOf(e)} (fix the code, never add to a baseline)`];
    return e.n > before ? [`raised: ${name} ${keyOf(e)} ${before} -> ${e.n} (fix the code, never raise a baseline)`] : [];
  });
}
