// The stdout summary of a report: counts, then the largest groups by number of importers.
const KINDS = ['const-object', 'interface', 'literal-union', 'type', 'z-enum'];
const MARKS = ['imported-across', 'same-shape'];
const TOP = 25;

const byText = (a, b) => (a < b ? -1 : Number(a > b));
const countOf = (rows, keyOf) => Map.groupBy(rows, keyOf);
const sizeIn = (groups, key) => groups.get(key)?.length ?? 0;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function workspaceLines(rows) {
  const perWs = countOf(rows, (r) => r.ws);
  return [...perWs.keys()].toSorted(byText).map((ws) => {
    const list = perWs.get(ws) ?? [];
    const kinds = countOf(list, (r) => r.kind);
    const parts = KINDS.filter((k) => kinds.has(k)).map((k) => `${k} ${sizeIn(kinds, k)}`);
    return `  ${ws}: ${list.length} (${parts.join(', ')})`;
  });
}

function markLine(rows) {
  const marked = rows.filter((r) => r.marks.length > 0);
  const parts = MARKS.map((m) => `${m} ${marked.filter((r) => r.marks.includes(m)).length}`);
  const open = marked.filter((r) => r.decision).length;
  return `marked: ${marked.length} (${parts.join(', ')}), needs a decision ${open}`;
}

const groupRows = (report) => [
  ...report.byName.map((g) => ({ label: `name ${g.name}`, group: g })),
  ...report.byShape.map((g) => ({ label: `shape ${g.shape}`, group: g })),
];

function topLines(report) {
  const ranked = groupRows(report).toSorted(
    (a, b) => b.group.importers.length - a.group.importers.length || byText(a.label, b.label),
  );
  return ranked.slice(0, TOP).map(({ label, group }, i) => {
    const users = group.importers.length === 0 ? '' : ` (${group.importers.join(', ')})`;
    const count = plural(group.importers.length, 'importer');
    const where = plural(group.workspaces.length, 'workspace');
    return `  ${i + 1}. ${label}: ${count}${users}; declared in ${where}`;
  });
}

/** The summary text of a report, the same for the same report. */
export function summaryText(report) {
  const rows = report.declarations;
  const kinds = countOf(rows, (r) => r.kind);
  const read = `${report.files} read, ${report.unparsed.length} not parsed`;
  return [
    'shared-types inventory (docs/62 part 3 §4)',
    `files: ${read}, ${rows.length} declarations`,
    'workspaces:',
    ...workspaceLines(rows),
    `kinds: ${KINDS.map((k) => `${k} ${sizeIn(kinds, k)}`).join(', ')}`,
    `names in 2+ workspaces: ${report.byName.length}`,
    `same-shape groups: ${report.byShape.length}`,
    `imported by another workspace: ${rows.filter((r) => r.importers.length > 0).length}`,
    markLine(rows),
    ...report.unparsed.map((u) => `not parsed: ${u.path}: ${u.error}`),
    `largest groups by importers (top ${TOP}):`,
    ...topLines(report),
  ].join('\n');
}
