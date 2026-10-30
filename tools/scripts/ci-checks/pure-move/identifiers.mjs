// Identifier renames a move map lists (`renames: { XQueries: XRepo }`, docs/32 D2): the checker accepts a code
// hunk whose only change, after paths, is such a name outside strings and comments, as the codemod writes it.
// The PR writes its own table, so a rename is held to D2's shape and must be fresh: `<X>Queries` → `<X>Repo`
// (same X), the new name nowhere in the base tree, the old one declared in a file of the diff.

const D2 = /^([A-Z][A-Za-z0-9]*)Queries$/;
const SKIP = String.raw`'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|\x60(?:\\.|[^\x60\\])*\x60|\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
const MAP = /^refactor\/moves\/[^/]+\.json$/;
/** Where a name must be fresh: the code of the base tree, this checker's own fixtures left out. */
export const CODE_SPECS = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs', ':!tools/scripts/ci-checks/**'];
const parse = (text) => {
  try {
    return JSON.parse(text)?.renames ?? {};
  } catch {
    return {};
  }
};

/** `{ old → new }` from the renames each move map of the diff ADDS (an edited map's older ones stay off). */
export function identifierTable(entries, read) {
  const table = new Map();
  for (const e of entries.filter((x) => MAP.test(x.to) && /^[AMR]/.test(x.status))) {
    const was = e.status === 'A' ? {} : parse(read('base', e.from));
    for (const [from, to] of Object.entries(parse(read('head', e.to)))) {
      if (was[from] === to) continue;
      if (to !== `${D2.exec(from)?.[1] ?? '\0'}Repo`) throw new Error(`rename ${from} → ${to}: only <X>Queries → <X>Repo (D2)`);
      table.set(from, to);
    }
  }
  return table;
}

/** Why the table's renames are not fresh (`grep(re, files?)`: base files matching a regex). */
export function renameProblems(table, grep, files) {
  return [...table].flatMap(([from, to]) => [
    ...(grep(`\\b${to}\\b`).length > 0 ? [`${to} already exists in the base tree`] : []),
    ...(grep(`(class|interface|type|function|const|let|enum) ${from}\\b`, files).length === 0 ? [`${from} is not declared in a file of this diff`] : []),
  ]);
}

/** A git grep's file list; exit 1 (no match) is an empty list, any other failure throws (fail closed). */
export function grepFiles(run) {
  try {
    return run().split('\n').filter(Boolean);
  } catch (e) {
    if (e?.status === 1) return [];
    throw e;
  }
}

/** The text with every listed identifier renamed; strings, templates and comments untouched. */
export function renameIdentifiers(text, table) {
  if (table.size === 0) return text;
  const re = new RegExp(`(${SKIP})|(?<![\\w$])(${[...table.keys()].join('|')})(?![\\w$])`, 'g');
  return text.replace(re, (all, skipped, name) => (skipped !== undefined ? all : table.get(name)));
}

/** A `refactor/guards/knip.json` line (`<path> <kind> <Name>`) with its name renamed. */
export function renameGuardLine(line, table) {
  const at = line.lastIndexOf(' ');
  const to = at < 0 ? undefined : table.get(line.slice(at + 1));
  return to === undefined ? line : `${line.slice(0, at + 1)}${to}`;
}
