import { describe, expect, it } from 'vitest';
import { draftBody, submitBody, submitProblem, valuesOf } from './form-values';
import { FULL_GRADES, reportView } from './report-fixture';
import { shouldSave } from './use-autosave';

describe('form values (R-REP-02)', () => {
  it('a fresh draft: empty strings, no grades', () => {
    const v = valuesOf(reportView());
    expect(v).toMatchObject({ attendance: null, recited: '', nextPlan: '', overall: null });
    expect(Object.values(v.grades).every((g) => g === null)).toBe(true);
  });

  it('round-trips a saved report into the draft body (camelCase, every field)', () => {
    const v = valuesOf(reportView({ attendance: 'late', new_memorization: 'الملك 1-5', next_plan: 'الملك 6-10', grades: { ...FULL_GRADES }, grade_overall: 'good' }));
    expect(draftBody(v)).toEqual({
      attendance: 'late',
      recited: '',
      newMemorization: 'الملك 1-5',
      revision: '',
      theory: '',
      grades: FULL_GRADES,
      overall: 'good',
      notes: '',
      homework: '',
      nextPlan: 'الملك 6-10',
    });
    expect(submitBody(v, 3).expectedVersion).toBe(3);
  });

  it('submitProblem mirrors the API: attendance first, then grades when attended', () => {
    const base = valuesOf(reportView());
    expect(submitProblem(base)).toBe('missing_attendance');
    expect(submitProblem({ ...base, attendance: 'on_time' })).toBe('missing_grades');
    expect(submitProblem({ ...base, attendance: 'on_time', grades: { ...FULL_GRADES }, overall: null })).toBe('missing_grades');
    expect(submitProblem({ ...base, attendance: 'on_time', grades: { ...FULL_GRADES }, overall: 'excellent' })).toBeNull();
    expect(submitProblem({ ...base, attendance: 'absent' })).toBeNull();
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
