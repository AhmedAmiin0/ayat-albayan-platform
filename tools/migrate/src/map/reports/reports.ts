// lesson_reports ← collectReports: submitted reports (version 1) with their first version row, as
// submit_report (migration 131) leaves them. PDFs: report_pdfs (pdf-import/). Imported reports keep
// pdf_status null so the app never re-renders or re-sends an old report to a family.
import type { EntityModule, SourceBundle, WriteContext } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { accepted, issueOnly } from '../../sources/sheets/issues.ts';
import type { Mapped } from '../../types.ts';
import { collectReports } from './collect.ts';

export function mapLessonReports(bundle: SourceBundle): Mapped[] {
  const { reports, issues } = collectReports(bundle);
  const ok = reports.map((r) =>
    accepted({
      key: r.reportKey,
      ref: r.ref,
      issues: r.issues,
      columns: {
        attendance: r.attendance,
        ...r.body,
        status: 'submitted',
        version: 1,
        submitted_at: r.submittedAt,
        // «اتبعت PDF ✅»: sent, at an unrecorded time — the submission time stands in for it.
        sent_at: r.sent ? r.submittedAt : null,
      },
      refs: {
        lesson_id: r.lessonKey,
        student_id: r.student,
        teacher_id: keys.teacher(r.teacher),
      },
    }),
  );
  return [...ok, ...issueOnly(issues)];
}

const LIFECYCLE = ['status', 'version', 'submitted_at', 'sent_at'];

export async function writeLessonReport(ctx: WriteContext) {
  const { tx, item, columns } = ctx;
  if (item.action !== 'create') {
    const id = item.targetId;
    if (!id) throw new Error('lesson_reports update without target id');
    // The report's lifecycle belongs to the app after import: a re-import never rewinds an
    // in-app edit's version (submit_report's expected_version check) or its send time.
    const content = Object.fromEntries(
      Object.entries(columns).filter(([k]) => !LIFECYCLE.includes(k)),
    );
    await tx.update({ table: 'lesson_reports', id, columns: content });
    return { targetId: id };
  }
  const id = await tx.insert({ table: 'lesson_reports', columns });
  if (!id) throw new Error('lesson_reports insert returned no id');
  await tx.insert({
    table: 'lesson_report_versions',
    columns: { report_id: id, version: 1, snapshot: { ...columns, id } },
  });
  return { targetId: id };
}

export const lessonReportsModule: EntityModule = {
  entity: 'lesson_reports',
  table: 'lesson_reports',
  map: mapLessonReports,
  write: writeLessonReport,
};
