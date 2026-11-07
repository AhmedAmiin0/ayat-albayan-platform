// Finding parity (docs/31b §5): every finding ESLint reports (no suppressions) must be one Oxlint
// reports too, as the same file + line + rule after mapping. A finding Oxlint places on another
// line of the same file under the same rule (complexity on a decorated method, an attribute of a
// multi-line JSX element) pairs up as `moved`; one with no partner left is `missing`, and an
// Oxlint finding with none is `extra` (a stricter port: reported, never a failure here).

const key = ({ file, line, rule }) => `${file}\0${line}\0${rule}`;
const group = ({ file, rule }) => `${file}\0${rule}`;

/** Removes one of each of `b` from `a` (multisets of keys); returns what `a` keeps. */
function minus(a, b) {
  const left = new Map();
  for (const item of b) left.set(key(item), (left.get(key(item)) ?? 0) + 1);
  return a.filter((item) => {
    const n = left.get(key(item)) ?? 0;
    left.set(key(item), n - 1);
    return n <= 0;
  });
}

/** Pairs leftovers of the same file + rule in line order: { moved, rest of each side }. */
function pairUp(lostOnes, extraOnes) {
  const pool = Map.groupBy(extraOnes, group);
  const moved = [];
  const missing = lostOnes.filter((finding) => {
    const partner = pool.get(group(finding))?.shift();
    if (partner) moved.push({ eslint: finding, oxlint: partner });
    return !partner;
  });
  const used = new Set(moved.map(({ oxlint }) => oxlint));
  return { moved, missing, extra: extraOnes.filter((finding) => !used.has(finding)) };
}

const byLine = (a, b) => a.line - b.line;

/** ESLint's and Oxlint's findings ({ file, line, rule }, Oxlint names) → the parity result. */
export function compareFindings(eslint, oxlint) {
  const lost = minus(eslint, oxlint).sort(byLine);
  const added = minus(oxlint, eslint).sort(byLine);
  return pairUp(lost, added);
}

/** Per-rule counts of a list of findings, rules sorted. */
export function perRule(findings) {
  const counts = {};
  for (const { rule } of findings) counts[rule] = (counts[rule] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/**
 * The failures: a missing finding of a rule not in `gaps` (docs/31b §3: rules that cannot move
 * yet), and a gap that has nothing missing any more (drop it from gaps.json).
 */
export function failures(missing, gaps) {
  const counts = perRule(missing);
  const lost = Object.entries(counts)
    .filter(([rule]) => !Object.hasOwn(gaps, rule))
    .map(([rule, n]) => `missing: ${rule} ×${n} (Oxlint does not report what ESLint does)`);
  const stale = Object.keys(gaps)
    .filter((rule) => !counts[rule])
    .map((rule) => `stale gap: ${rule} misses nothing now (remove it from gaps.json)`);
  return [...lost, ...stale];
}
