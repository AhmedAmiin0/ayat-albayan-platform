// PDF → lesson report (pure): the student by folder name (file name for loose PDFs), the lesson
// by the date in the file name. Exactly one report of that student on that lesson day, with the
// exact name = match. A weaker match — a similar (not equal) name, or a report submitted (not held)
// on that day — is never attached on its own: it goes to review until the owner lists the zip path
// in cache/pdf-approved.json (bundle.approvedPdfs). A wrong match sends one child's report PDF to
// another child's parent.
import { arabicNameSimilar } from '@ab/shared';
import type { SourceBundle } from '../entities/contract.ts';
import { keys, personName } from '../keys.ts';
import { splitStudentKey } from '../plan/match/similar.ts';
import type { Desired } from '../plan/resolve.ts';
import { localToday } from '../time.ts';
import type { Mapped, NaturalKey, RowIssue, SourceRow } from '../types.ts';
import { type PdfName, ZIP_FILES, isPdf, parsePdfName } from './files.ts';

const riyadhDay = (t: number): string => localToday({ now: new Date(t), tz: 'Asia/Riyadh' });

/** Local day of a lesson key: report-derived keys end in 'YYYY-MM-DD', rule ones in a UTC instant. */
export function lessonDay(lessonKey: string): string {
  const at = lessonKey.slice(lessonKey.lastIndexOf('|') + 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
  const t = Date.parse(at);
  return Number.isNaN(t) ? '' : riyadhDay(t);
}

interface ReportRef {
  report: NaturalKey;
  student: NaturalKey;
  lesson: NaturalKey;
  day: string;
  /** Riyadh day of submitted_at: some PDFs are named after the day the form was sent. */
  sentDay: string;
}

function reportRefs(reports: readonly Desired[]): ReportRef[] {
  return reports.flatMap((d) => {
    const student = d.record.refs['student_id'];
    const lesson = d.record.refs['lesson_id'];
    const sent = Date.parse(String(d.record.columns['submitted_at'] ?? ''));
    const sentDay = Number.isNaN(sent) ? '' : riyadhDay(sent);
    return student && lesson
      ? [{ report: d.key, student, lesson, day: lessonDay(lesson.key), sentDay }]
      : [];
  });
}

const issue = (row: SourceRow, detail: string): RowIssue => ({
  code: 'missing_ref',
  severity: 'review',
  entity: 'report_pdfs',
  ref: row.ref,
  field: 'report_id',
  detail,
});

function candidates(name: PdfName, reports: readonly ReportRef[]) {
  const who = personName(name.folder ?? name.person);
  const named = (list: readonly ReportRef[]) => {
    const by = (pred: (n: string) => boolean) =>
      list.filter((r) => pred(splitStudentKey(r.student.key)[1]));
    const exact = by((n) => n === who);
    return exact.length
      ? { hits: exact, similar: false }
      : { hits: by((n) => arabicNameSimilar(n, who)), similar: true };
  };
  const onDay = named(reports.filter((r) => r.day === name.date));
  if (onDay.hits.length) return { ...onDay, weak: onDay.similar ? 'a similar student name' : '' };
  const sent = named(reports.filter((r) => r.sentDay === name.date));
  return { ...sent, weak: `a report submitted that day${sent.similar ? ', similar name' : ''}` };
}

function matchOne(o: { row: SourceRow; name: PdfName | undefined }, ctx: MatchCtx): Mapped {
  const { row, name } = o;
  if (!name) return { ok: false, ref: row.ref, issues: [issue(row, 'no date in the file name')] };
  const { hits, weak } = candidates(name, ctx.reports);
  const who = name.folder ?? name.person;
  const hit = hits[0];
  if (!hit || hits.length > 1) {
    const why = hits.length ? `${hits.length} reports match` : 'no report';
    return { ok: false, ref: row.ref, issues: [issue(row, `${why} for «${who}» on ${name.date}`)] };
  }
  if (weak && !ctx.approved.has(name.path)) {
    const detail = `only ${weak} matches «${who}» on ${name.date}: «${splitStudentKey(hit.student.key)[1]}» lesson ${lessonDay(hit.lesson.key)}; add the zip path to cache/pdf-approved.json to attach it`;
    return { ok: false, ref: row.ref, issues: [issue(row, detail)] };
  }
  return {
    ok: true,
    key: keys.reportPdf(hit.report.key),
    ref: row.ref,
    value: {
      columns: { zip_path: name.path },
      refs: { report_id: hit.report, student_id: hit.student, lesson_id: hit.lesson },
    },
    issues: [],
  };
}

interface MatchCtx {
  reports: readonly ReportRef[];
  approved: ReadonlySet<string>;
}

export function matchPdfs(bundle: SourceBundle): Mapped[] {
  const ctx: MatchCtx = {
    reports: reportRefs(bundle.earlier.get('lesson_reports') ?? []),
    approved: bundle.approvedPdfs ?? new Set(),
  };
  const pdfs = (bundle.sheets[ZIP_FILES] ?? []).filter((r) => isPdf(String(r.fields['name'])));
  const parsed = pdfs.map((row) => ({ row, name: parsePdfName(String(row.fields['name'])) }));
  // Originals before their «(n)» re-downloads, so resolve() keeps the original and flags the copy.
  parsed.sort((a, b) => (a.name?.copy ?? 0) - (b.name?.copy ?? 0));
  return parsed.map((p) => matchOne(p, ctx));
}
