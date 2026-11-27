// The whole inventory of a tree: declarations with their importers, groups by name and by shape,
// and the two marks the shared-types guard will fail on (docs/62 part 3 §4).
import { scanFile } from './declarations.mjs';
import { isScanned } from './files.mjs';
import { homeOf } from './home.mjs';

const byText = (a, b) => (a < b ? -1 : Number(a > b));
const sorted = (values) => [...new Set(values)].toSorted(byText);
const isApp = (ws) => ws.startsWith('apps/');
const keyOf = (ws, name) => `${ws}::${name}`;

function importIndex(scans) {
  const rows = scans.flatMap((s) => s.imports.map((i) => ({ ...i, from: s.ws })));
  const foreign = rows.filter((i) => i.from !== i.target);
  const grouped = Map.groupBy(foreign, (i) => keyOf(i.target, i.name));
  return new Map([...grouped].map(([key, list]) => [key, sorted(list.map((i) => i.from))]));
}

const spanning = (map, label) =>
  [...map]
    .map(([key, rows]) => ({
      [label]: key,
      workspaces: sorted(rows.map((r) => r.ws)),
      declarations: rows.map((r) => r.id),
      importers: sorted(rows.flatMap((r) => r.importers)),
    }))
    .filter((g) => g.workspaces.length >= 2)
    .toSorted((a, b) => byText(a[label], b[label]));

const groupsOf = (rows, field) =>
  Map.groupBy(
    rows.filter((r) => r[field] !== null),
    (r) => r[field],
  );
const isNamed = (row) => row.name !== 'default';

const MARKS = [
  ['imported-across', (row) => isApp(row.ws) && row.importers.length > 0],
  ['same-shape', (row, shapes) => isApp(row.ws) && shapes.has(row.shape)],
];

function marked(row, { shapes, members }) {
  const marks = MARKS.filter(([, applies]) => applies(row, shapes)).map(([mark]) => mark);
  const home = marks.length === 0 ? {} : homeOf(row, members.get(row.shape) ?? []);
  return { ...row, marks, ...home };
}

/** `files`: path → text. Unscanned paths are ignored; the result is in a fixed order. */
export function buildReport(files) {
  const paths = [...files.keys()].filter(isScanned).toSorted(byText);
  const scans = paths.map((path) => scanFile(path, files.get(path) ?? ''));
  const importers = importIndex(scans);
  const rows = scans
    .flatMap((s) => s.declarations)
    .map((d) => ({
      ...d,
      id: keyOf(d.path, d.name),
      importers: importers.get(keyOf(d.ws, d.name)) ?? [],
    }));
  const byShape = spanning(groupsOf(rows, 'shape'), 'shape');
  const shapes = new Set(byShape.map((g) => g.shape));
  const members = new Map([...groupsOf(rows, 'shape')].filter(([shape]) => shapes.has(shape)));
  return {
    files: paths.length,
    unparsed: scans.filter((s) => s.error).map(({ path, error }) => ({ path, error })),
    declarations: rows.map((row) => marked(row, { shapes, members })),
    byName: spanning(groupsOf(rows.filter(isNamed), 'name'), 'name'),
    byShape,
  };
}
