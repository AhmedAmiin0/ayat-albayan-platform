import { describe, expect, it } from 'vitest';
import { AFTER_FIELDS, DONE_FIELDS, draftBody, shouldSave, submitBody, submitProblem, valuesOf } from './form-values.js';
import type { ReportView } from './views.js';

const FULL_GRADES = {
  recitation: 'excellent',
  memorization: 'very_good',
  revision: 'good',
  tajweed: 'very_good',
  engagement: 'excellent',
  commitment: 'excellent',
} as const;
const NO_GRADES = { recitation: null, memorization: null, revision: null, tajweed: null, engagement: null, commitment: null };

function reportView(over: Partial<ReportView> = {}): ReportView {
  return {
    ...{ id: 'r-1', lesson_id: 'l-1', student_id: 's-1', teacher_id: 't-1', attendance: null },
    ...{ recited: null, new_memorization: null, revision: null, theory: null, grades: { ...NO_GRADES } },
    ...{ grade_overall: null, notes: null, homework: null, next_plan: null, status: 'draft', version: 0 },
    ...{ submitted_at: null, edited_at: null, pdf_status: null, pdf_error: null, sent_at: null },
    ...{ attachments: [], can_edit: true, edit_until: null },
    ...over,
  };
}

describe('form values (R-REP-02)', () => {
  it('a fresh draft: empty strings, no grades', () => {
    const v = valuesOf(reportView());
    expect(v).toMatchObject({ attendance: null, recited: '', nextPlan: '', overall: null });
    expect(Object.values(v.grades).every((g) => g === null)).toBe(true);
  });

  it('round-trips a saved report into the draft body (camelCase, every field)', () => {
    const saved = { attendance: 'late', new_memorization: 'الملك 1-5', next_plan: 'الملك 6-10', grade_overall: 'good' } as const;
    const v = valuesOf(reportView({ ...saved, grades: { ...FULL_GRADES } }));
    expect(draftBody(v)).toEqual({
      ...{ attendance: 'late', recited: '', newMemorization: 'الملك 1-5', revision: '', theory: '' },
      ...{ grades: FULL_GRADES, overall: 'good', notes: '', homework: '', nextPlan: 'الملك 6-10' },
    });
    expect(submitBody(v, 3).expectedVersion).toBe(3);
  });

  it('submitProblem mirrors the API: attendance first, then grades when attended', () => {
    const base = valuesOf(reportView());
    expect(submitProblem(base)).toBe('missing_attendance');
    expect(submitProblem({ ...base, attendance: 'on_time' })).toBe('missing_grades');
    expect(submitProblem({ ...base, attendance: 'on_time', grades: { ...FULL_GRADES } })).toBe('missing_grades');
    expect(submitProblem({ ...base, attendance: 'on_time', grades: { ...FULL_GRADES }, overall: 'excellent' })).toBeNull();
    expect(submitProblem({ ...base, attendance: 'absent' })).toBeNull();
  });

  it('the text fields in form order (web and mobile render the same list)', () => {
    expect([...DONE_FIELDS, ...AFTER_FIELDS]).toEqual(['recited', 'newMemorization', 'revision', 'theory', 'notes', 'homework', 'nextPlan']);
  });
});

describe('shouldSave (autosave)', () => {
  const s = { enabled: true, settled: 'b', saved: 'a', failed: null, pending: false };
  it('saves a settled change', () => expect(shouldSave(s)).toBe(true));
  it.each([
    ['nothing changed', { saved: 'b' }],
    ['a save in flight', { pending: true }],
    ['submitted (disabled)', { enabled: false }],
    ['the same body just failed', { failed: 'b' }],
  ])('not when %s', (_n, over) => expect(shouldSave({ ...s, ...over })).toBe(false));
});
