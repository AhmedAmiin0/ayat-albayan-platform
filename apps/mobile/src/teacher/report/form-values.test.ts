import { REPORT_RUBRICS } from '@ab/shared';
import { t } from '@/lib/i18n';
import { FULL_GRADES, reportView } from './fixtures';
import { AFTER_FIELDS, DONE_FIELDS, draftBody, shouldSave, submitBody, submitProblem, valuesOf } from './form-values';

test('the form’s questions in the Google Form’s order, labels verbatim (as the web form)', () => {
  const labels = [
    ...DONE_FIELDS.map((k) => t.reports[k]),
    ...REPORT_RUBRICS.map((r) => t.reports.rubric[r]),
    t.reports.overall,
    ...AFTER_FIELDS.map((k) => t.reports[k]),
  ];
  expect(labels).toEqual([
    'التسميع (المُسمَّع)',
    'الحفظ الجديد',
    'المراجعة',
    'الدرس النظري / أحكام التجويد',
    'التلاوة والنطق',
    'الحفظ الجديد',
    'المراجعة',
    'التجويد',
    'الاستيعاب والتفاعل',
    'الالتزام والحضور',
    'التقدير العام للحلقة',
    'ملاحظات المعلمة',
    'الواجب المطلوب قبل الحلقة القادمة',
    'خطة الحلقة القادمة',
  ]);
});

test('a fresh draft: empty strings, no grades; round-trips into the camelCase body', () => {
  const v = valuesOf(reportView({ attendance: 'late', new_memorization: 'الملك 1-5', grades: { ...FULL_GRADES }, grade_overall: 'good' }));
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
    nextPlan: '',
  });
  expect(submitBody(v, 3).expectedVersion).toBe(3);
});

test('submitProblem: attendance, then grades, then the form’s required text when attended', () => {
  const base = valuesOf(reportView());
  const graded = { ...base, attendance: 'on_time' as const, grades: { ...FULL_GRADES }, overall: 'excellent' as const };
  const written = { ...graded, recited: 'الفاتحة', newMemorization: 'الملك 1-5', revision: 'النبأ', notes: 'ممتازة', homework: 'الملك 6-10' };
  expect(submitProblem(base)).toBe('missing_attendance');
  expect(submitProblem({ ...base, attendance: 'on_time' })).toBe('missing_grades');
  expect(submitProblem({ ...graded, overall: null })).toBe('missing_grades');
  expect(submitProblem(graded)).toBe('missing_text');
  expect(submitProblem({ ...written, homework: '   ' })).toBe('missing_text');
  // الدرس النظري and خطة الحلقة القادمة stay optional.
  expect(submitProblem(written)).toBeNull();
  // Absent or excused: nothing else is required.
  expect(submitProblem({ ...base, attendance: 'absent' })).toBeNull();
  expect(submitProblem({ ...base, attendance: 'excused' })).toBeNull();
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
