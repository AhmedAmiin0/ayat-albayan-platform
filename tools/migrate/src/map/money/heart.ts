// HEART «subscription» rows → subscription facts (E1/E2). Names are Latin, so the student is found
// by guardian phone (match.ts). Price comes from FIN «Revenue/Desc» of the same month when exactly
// one single-person row names the student; otherwise 0 + review (the owner enters it). Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { num, phoneCell, text, ymd } from '../../sources/sheets/cells.ts';
import { type IssueInput, issuesFor } from '../../sources/sheets/issues.ts';
import { testReason } from '../../sources/sheets/test-rows.ts';
import { teacherFromText } from '../../sources/values.ts';
import type { NaturalKey, RowIssue, SourceRow } from '../../types.ts';
import { type StudentIndex, findStudent, studentIndex } from '../people/match.ts';
import { finPrice } from './fin.ts';

const PACKAGES = new Set(['4', '8', '12', '16', '20', '28']);

export interface HeartSub {
  ref: SourceRow['ref'];
  key: NaturalKey;
  student: NaturalKey;
  startsOn: string;
  total: number;
  remaining: number;
  paid: boolean;
  price: { amount: number; fin: SourceRow['ref'] } | null;
  issues: RowIssue[];
}

type HeartResult = HeartSub | { ref: SourceRow['ref']; issues: RowIssue[] };
type Fields = SourceRow['fields'];
type Located = { ok: true; student: NaturalKey } | { ok: false; issue: IssueInput };

function teacherCheck(o: { ix: StudentIndex; student: NaturalKey; raw: string | null }): boolean {
  const slug = teacherFromText(o.raw);
  const s = o.ix.all.find((d) => d.key.key === o.student.key);
  const own = s?.record.refs.teacher_id?.key;
  return !slug || !own || slug === own;
}

function unmatched(o: { ix: StudentIndex; phone: string; reason: string }): IssueInput {
  // Several children fit the Latin name (siblings): the owner picks, nothing is rejected.
  const kids = (o.ix.byPhone.get(o.phone) ?? []).map((s) => `«${s.record.columns.name}»`);
  const ambiguous = o.reason === 'ambiguous';
  return {
    code: 'missing_ref',
    severity: ambiguous ? 'review' : 'reject',
    field: 'student',
    detail: ambiguous ? `ambiguous: one of ${kids.join(', ')}` : o.reason,
  };
}

function locate(f: Fields, o: { ix: StudentIndex; name: string | null }): Located {
  if (testReason({ names: [o.name] }))
    return { ok: false, issue: { code: 'test_row', severity: 'reject' } };
  const phone = phoneCell(f.phone);
  if (!phone.ok) {
    const detail = phone.reason;
    return { ok: false, issue: { code: 'bad_phone', severity: 'reject', field: 'phone', detail } };
  }
  const found = findStudent(o.ix, { phone: phone.e164, name: o.name });
  if (!found.ok)
    return { ok: false, issue: unmatched({ ix: o.ix, phone: phone.e164, reason: found.reason }) };
  return { ok: true, student: found.student.key };
}

function warnings(f: Fields, o: { ix: StudentIndex; student: NaturalKey; priced: boolean }) {
  const checks: [boolean, IssueInput][] = [
    [
      !teacherCheck({ ix: o.ix, student: o.student, raw: text(f.teacher) }),
      { code: 'conflict', severity: 'warn', field: 'teacher' },
    ],
    [!o.priced, { code: 'missing_field', severity: 'review', field: 'price' }],
  ];
  return checks.filter(([raised]) => raised).map(([, i]) => i);
}

const isPaid = (f: Fields): boolean => /^paid$/i.test(text(f.paid_status) ?? '');

function heartPrice(bundle: SourceBundle, o: { name: string | null; startsOn: string }) {
  return o.name ? finPrice(bundle, { name: o.name, month: o.startsOn.slice(0, 7) }) : null;
}

function heartRow(row: SourceRow, o: { ix: StudentIndex; bundle: SourceBundle }): HeartResult {
  const f = row.fields;
  const issue = issuesFor('subscriptions', row.ref);
  const fail = (i: IssueInput) => ({ ref: row.ref, issues: [issue(i)] });
  const name = text(f.name);
  const located = locate(f, { ix: o.ix, name });
  if (!located.ok) return fail(located.issue);
  const startsOn = ymd(f.date);
  if (!startsOn) return fail({ code: 'missing_field', severity: 'reject', field: 'date' });
  const used = num(f.lessons_used) ?? 0;
  const remaining = num(f.lessons_remaining) ?? 0;
  if (used + remaining <= 0)
    return fail({ code: 'missing_field', severity: 'reject', field: 'lessons' });
  const student = located.student;
  const price = heartPrice(o.bundle, { name, startsOn });
  return {
    ref: row.ref,
    key: keys.subscription({ student: student.key, startsOn }),
    student,
    startsOn,
    total: used + remaining,
    remaining,
    paid: isPaid(f),
    price,
    issues: warnings(f, { ix: o.ix, student, priced: price !== null }).map(issue),
  };
}

export function heartSubs(bundle: SourceBundle): HeartResult[] {
  const ix = studentIndex(bundle.earlier.get('students'));
  return (bundle.sheets.heart_subscriptions ?? []).map((r) => heartRow(r, { ix, bundle }));
}

export function packageOf(total: number): string | null {
  return PACKAGES.has(String(total)) ? String(total) : null;
}
