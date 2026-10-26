// out/review.xlsx for the owner (docs/06 «Validation»): proposed merges, duplicates to decide,
// rejected rows with reasons, unmatched PDFs, missing teachers, field changes, adopted app rows,
// the rest.
// Contains source row references and details (names) — out/ is git-ignored; never commit or share.
import writeXlsxFile from 'write-excel-file/node';
import { stableJson } from '../hash.ts';
import type { FieldChange } from '../plan/changes.ts';
import type { Plan, RowIssue } from '../types.ts';

type Row = (string | number | null)[];

const ISSUE_HEADER: Row = ['entity', 'issue', 'source', 'tab', 'row', 'file', 'field', 'detail'];

function issueRows(issues: readonly RowIssue[]): Row[] {
  return [
    ISSUE_HEADER,
    ...issues.map((i) => [
      i.entity,
      i.code,
      i.ref.source,
      i.ref.tab,
      i.ref.row,
      i.ref.file ?? null,
      i.field ?? null,
      i.detail ?? null,
    ]),
  ];
}

const cell = (v: unknown): string | number | null => {
  if (v === null || v === undefined) return null;
  return typeof v === 'number' || typeof v === 'string' ? v : stableJson(v);
};

function changeRows(changes: readonly FieldChange[]): Row[] {
  return [
    ['entity', 'key', 'source', 'tab', 'row', 'field', 'from', 'to'],
    ...changes.map((c) => [
      c.entity,
      c.key,
      c.ref.source,
      c.ref.tab,
      c.ref.row,
      c.field,
      cell(c.from),
      cell(c.to),
    ]),
  ];
}

/** Rows the app created before the import that imported records will link to (never overwritten). */
function adoptedRows(items: Plan['items']): Row[] {
  return [
    ['entity', 'key', 'target id', 'source', 'tab', 'row'],
    ...items
      .filter((i) => i.action === 'adopt')
      .map((i) => [i.key.entity, i.key.key, i.targetId, i.ref.source, i.ref.tab, i.ref.row]),
  ];
}

/** A plan.json from before field changes existed has no `changes`. */
export type ReviewPlan = Plan & { changes?: readonly FieldChange[] };

interface ReviewSheet {
  sheet: string;
  data: Row[];
}

const isPdf = (i: RowIssue) => i.entity === 'report_pdfs';
const isMerge = (i: RowIssue) => i.code === 'merge_candidate';
const isDuplicate = (i: RowIssue) => i.code === 'conflict' || i.code === 'duplicate';
const isTeacher = (i: RowIssue) =>
  i.code === 'unknown_teacher' ||
  (i.code === 'missing_ref' && (i.field ?? '').includes('teacher_id'));

/** Pure: the workbook's sheets. «rejected» lists every rejected row; the others are views. */
export function reviewSheets(plan: ReviewPlan): ReviewSheet[] {
  const by = (pred: (i: RowIssue) => boolean) => issueRows(plan.issues.filter(pred));
  const rest = (i: RowIssue) => !isPdf(i) && !isMerge(i) && !isDuplicate(i) && !isTeacher(i);
  const summary: Row[] = [['entity', 'create', 'update', 'adopt', 'skip', 'reject', 'review']];
  for (const [entity, c] of Object.entries(plan.counts)) {
    if (c) summary.push([entity, c.create, c.update, c.adopt, c.skip, c.reject, c.review]);
  }
  return [
    { sheet: 'summary', data: summary },
    { sheet: 'merges proposed', data: by((i) => isMerge(i) && !isPdf(i)) },
    { sheet: 'duplicates to decide', data: by((i) => isDuplicate(i) && !isPdf(i)) },
    { sheet: 'rejected', data: by((i) => i.severity === 'reject' && !isPdf(i)) },
    { sheet: 'unmatched PDFs', data: by(isPdf) },
    { sheet: 'missing teachers', data: by(isTeacher) },
    { sheet: 'changes', data: changeRows(plan.changes ?? []) },
    { sheet: 'adopted', data: adoptedRows(plan.items) },
    { sheet: 'review', data: by((i) => i.severity === 'review' && rest(i)) },
    { sheet: 'warnings', data: by((i) => i.severity === 'warn' && rest(i)) },
  ];
}

export async function writeReview(plan: ReviewPlan, path: string): Promise<void> {
  const sheets = reviewSheets(plan).map((s) => ({ ...s, rightToLeft: false, stickyRowsCount: 1 }));
  await writeXlsxFile(sheets).toFile(path);
}
