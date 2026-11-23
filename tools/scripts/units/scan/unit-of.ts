import { BARREL, isCode, isTest, ROLES, stemOf } from './files.ts';

/** `X.props` → `X`; any other stem is its own owner. */
function ownerOf(stem: string): string {
  const at = stem.lastIndexOf('.');
  return at > 0 && ROLES.has(stem.slice(at + 1)) ? stem.slice(0, at) : stem;
}

const byLength = (a: string, b: string): number => b.length - a.length;

/**
 * A file's unit: the longest non-test code stem S with `name === S + '.' + rest` (so
 * `env.blank.test.ts` is env.blank's, not env's), then a role file's owner.
 */
export function unitOf(name: string, stems: readonly string[]): string | undefined {
  const stem = stems.filter((s) => name.startsWith(`${s}.`)).sort(byLength)[0];
  return stem === undefined ? undefined : ownerOf(stem);
}

/** The units of one folder's file names: unit → its file names, sorted. */
export function unitsOf(names: readonly string[]): Map<string, string[]> {
  const code = names.filter(isCode).sort();
  const stems = code.filter((n) => !isTest(n)).map(stemOf);
  const units = new Map<string, string[]>();
  for (const name of code) {
    const unit = unitOf(name, stems);
    if (unit === undefined || unit === BARREL) continue;
    units.set(unit, [...(units.get(unit) ?? []), name]);
  }
  return units;
}
