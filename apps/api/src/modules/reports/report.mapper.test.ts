import { describe, expect, it } from 'vitest';
import { formColumns, reportView, submitColumns } from './report.mapper';
import { AFTER, FULL_GRADES, reportRow, submittedRow } from './reports.fakes';

const DAY_LATER = new Date(AFTER.getTime() + 24 * 3_600_000);

describe('reportView (docs/11 §4 ReportView)', () => {
  it('maps the grade columns to grades by rubric and hides pdf_path', () => {
    const view = reportView(submittedRow({ grade_tajweed: 'good', grade_overall: 'excellent', pdf_path: 's/l.pdf' }), {
      role: 'teacher',
      now: AFTER,
      hours: 24,
    });
    expect(view.grades).toEqual({
      recitation: null,
      memorization: null,
      revision: null,
      tajweed: 'good',
      engagement: null,
      commitment: null,
    });
    expect(view.grade_overall).toBe('excellent');
    expect(view).not.toHaveProperty('pdf_path');
  });

  it('a draft: editable, no window yet', () => {
    const view = reportView(reportRow(), { role: 'teacher', now: AFTER, hours: 24 });
    expect(view).toMatchObject({ can_edit: true, edit_until: null, status: 'draft', version: 0 });
  });

  it('submitted: the teacher edits until submit + hours; the admin always (R-REP-02)', () => {
    const row = submittedRow();
    expect(reportView(row, { role: 'teacher', now: AFTER, hours: 24 })).toMatchObject({
      can_edit: true,
      edit_until: DAY_LATER.toISOString(),
    });
    expect(reportView(row, { role: 'teacher', now: DAY_LATER, hours: 24 }).can_edit).toBe(false);
    expect(reportView(row, { role: 'admin', now: DAY_LATER, hours: 24 }).can_edit).toBe(true);
    expect(reportView(row, { role: null, now: AFTER, hours: 24 }).can_edit).toBe(false);
  });

  it('attachments oldest first', () => {
    const file = (id: string, created_at: string) => ({ id, storage_path: `r/${id}.png`, mime: 'image/png', size: 9, created_at });
    const view = reportView(reportRow({ attachments: [file('b', '2026-10-04T15:02:00Z'), file('a', '2026-10-04T15:01:00Z')] }), {
      role: 'admin',
      now: AFTER,
      hours: 24,
    });
    expect(view.attachments.map((a) => a.id)).toEqual(['a', 'b']);
  });
});

describe('formColumns (R-REP-02 autosave writes only what was sent)', () => {
  it('maps camelCase to columns and grades to grade_* columns', () => {
    expect(
      formColumns({ attendance: 'late', newMemorization: 'الملك 1-5', nextPlan: 'الملك 6-10', grades: { tajweed: 'good' }, overall: 'very_good' }),
    ).toEqual({
      attendance: 'late',
      new_memorization: 'الملك 1-5',
      next_plan: 'الملك 6-10',
      grade_tajweed: 'good',
      grade_overall: 'very_good',
    });
  });

  it('an empty autosave writes nothing; null clears', () => {
    expect(formColumns({})).toEqual({});
    expect(formColumns({ notes: null, grades: { revision: null } })).toEqual({ notes: null, grade_revision: null });
  });
});

describe('submitColumns (a submit is the whole form)', () => {
  it('every form column is written; a field left out is cleared', () => {
    const cols = submitColumns({ attendance: 'on_time', grades: FULL_GRADES, overall: 'excellent', homework: 'الملك' });
    expect(cols).toMatchObject({
      attendance: 'on_time',
      grade_recitation: 'excellent',
      grade_commitment: 'excellent',
      grade_overall: 'excellent',
      homework: 'الملك',
      notes: null,
      recited: null,
      next_plan: null,
    });
    expect(Object.keys(cols)).toHaveLength(15);
  });
});
